"""
Performance and load testing for the conversation system.

This module tests system performance under various load conditions,
verifies response time requirements, and tests database performance.

Requirements tested:
- 4.1: System uptime and performance requirements
- 5.3: Response time requirements (< 2 minutes for processing)
"""

import pytest
import asyncio
import time
import statistics
from unittest.mock import AsyncMock, MagicMock, patch
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
import uuid
from typing import List, Dict, Any, Tuple
import gc
import resource
import sys

from app.services.flow_engine import FlowEngine, FlowStep, FlowResponse
from app.services.state_manager import StateManager
from app.services.message_builder import MessageBuilder


class PerformanceMetrics:
    """Container for performance metrics."""
    
    def __init__(self):
        self.response_times: List[float] = []
        self.memory_usage: List[float] = []
        self.cpu_usage: List[float] = []
        self.error_count: int = 0
        self.success_count: int = 0
        self.start_time: float = 0
        self.end_time: float = 0
    
    def add_response_time(self, response_time: float):
        """Add a response time measurement."""
        self.response_times.append(response_time)
    
    def add_memory_usage(self, memory_mb: float):
        """Add memory usage measurement."""
        self.memory_usage.append(memory_mb)
    
    def add_cpu_usage(self, cpu_percent: float):
        """Add CPU usage measurement."""
        self.cpu_usage.append(cpu_percent)
    
    def record_success(self):
        """Record a successful operation."""
        self.success_count += 1
    
    def record_error(self):
        """Record an error."""
        self.error_count += 1
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get performance statistics."""
        total_duration = self.end_time - self.start_time if self.end_time > self.start_time else 0
        total_operations = self.success_count + self.error_count
        
        stats = {
            "total_duration": total_duration,
            "total_operations": total_operations,
            "success_count": self.success_count,
            "error_count": self.error_count,
            "success_rate": (self.success_count / total_operations * 100) if total_operations > 0 else 0,
            "operations_per_second": total_operations / total_duration if total_duration > 0 else 0
        }
        
        if self.response_times:
            stats.update({
                "response_time_avg": statistics.mean(self.response_times),
                "response_time_median": statistics.median(self.response_times),
                "response_time_min": min(self.response_times),
                "response_time_max": max(self.response_times),
                "response_time_p95": self._percentile(self.response_times, 95),
                "response_time_p99": self._percentile(self.response_times, 99)
            })
        
        if self.memory_usage:
            stats.update({
                "memory_avg_mb": statistics.mean(self.memory_usage),
                "memory_max_mb": max(self.memory_usage),
                "memory_min_mb": min(self.memory_usage)
            })
        
        if self.cpu_usage:
            stats.update({
                "cpu_avg_percent": statistics.mean(self.cpu_usage),
                "cpu_max_percent": max(self.cpu_usage)
            })
        
        return stats
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile of data."""
        sorted_data = sorted(data)
        index = int(len(sorted_data) * percentile / 100)
        return sorted_data[min(index, len(sorted_data) - 1)]


class TestPerformanceBaseline:
    """Test baseline performance metrics."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.mock_state_manager = AsyncMock(spec=StateManager)
        
        # Configure async mocks properly
        self.mock_state_manager.get_or_create_session = AsyncMock()
        self.mock_state_manager.update_conversation_data = AsyncMock()
        self.mock_state_manager.update_session_step = AsyncMock()
        self.mock_state_manager.record_analytics_event = AsyncMock()
        self.mock_state_manager.add_message = AsyncMock()
        
        # Mock the timeout service to avoid WhatsApp client initialization
        with patch('app.services.flow_engine.get_timeout_service') as mock_timeout_service:
            mock_timeout_service.return_value = MagicMock()
            self.flow_engine = FlowEngine(state_manager=self.mock_state_manager)
        
        # Setup mock session
        self.mock_session = MagicMock()
        self.mock_session.id = uuid.uuid4()
        self.mock_session.phone_number = "5511999999999"
        self.mock_session.current_step = "welcome"
        
        self.mock_state_manager.get_or_create_session.return_value = self.mock_session
    
    @pytest.mark.asyncio
    async def test_single_message_response_time(self):
        """Test response time for single message processing."""
        message = {"type": "text", "text": {"body": "Olá"}}
        
        # Measure response time
        start_time = time.time()
        response = await self.flow_engine.process_message(
            user_id=str(uuid.uuid4()),
            phone_number="5511999999999",
            message=message
        )
        end_time = time.time()
        
        response_time = end_time - start_time
        
        # Requirement 5.3: Processing should be < 2 minutes (120 seconds)
        assert response_time < 120.0, f"Response time {response_time:.3f}s exceeds 2 minute requirement"
        
        # Performance target: < 1 second for good user experience
        assert response_time < 1.0, f"Response time {response_time:.3f}s exceeds 1 second target"
        
        print(f"✓ Single message response time: {response_time:.3f}s")
    
    @pytest.mark.asyncio
    async def test_message_builder_performance(self):
        """Test message builder performance."""
        message_builder = MessageBuilder()
        
        # Test welcome message creation time
        start_time = time.time()
        for _ in range(100):
            welcome_msg = message_builder.build_welcome_message()
        end_time = time.time()
        
        avg_time = (end_time - start_time) / 100
        
        # Should be very fast (< 10ms per message)
        assert avg_time < 0.01, f"Message building too slow: {avg_time:.4f}s per message"
        
        print(f"✓ Message builder performance: {avg_time*1000:.2f}ms per message")
    
    @pytest.mark.asyncio
    async def test_memory_usage_baseline(self):
        """Test baseline memory usage."""
        # Use resource module for memory tracking
        initial_memory = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        if sys.platform == 'darwin':  # macOS reports in bytes
            initial_memory = initial_memory / 1024 / 1024  # Convert to MB
        else:  # Linux reports in KB
            initial_memory = initial_memory / 1024  # Convert to MB
        
        # Process multiple messages
        messages = [
            {"type": "text", "text": {"body": f"Message {i}"}}
            for i in range(50)
        ]
        
        for message in messages:
            await self.flow_engine.process_message(
                user_id=str(uuid.uuid4()),
                phone_number="5511999999999",
                message=message
            )
        
        final_memory = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        if sys.platform == 'darwin':  # macOS reports in bytes
            final_memory = final_memory / 1024 / 1024  # Convert to MB
        else:  # Linux reports in KB
            final_memory = final_memory / 1024  # Convert to MB
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (< 50MB for 50 messages)
        assert memory_increase < 50, f"Memory increase too high: {memory_increase:.2f}MB"
        
        print(f"✓ Memory usage increase: {memory_increase:.2f}MB for 50 messages")


class TestConcurrentLoad:
    """Test system performance under concurrent load."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.mock_state_manager = AsyncMock(spec=StateManager)
        
        # Configure async mocks
        self.mock_state_manager.get_or_create_session = AsyncMock()
        self.mock_state_manager.update_conversation_data = AsyncMock()
        self.mock_state_manager.update_session_step = AsyncMock()
        self.mock_state_manager.record_analytics_event = AsyncMock()
        self.mock_state_manager.add_message = AsyncMock()
        
        with patch('app.services.flow_engine.get_timeout_service') as mock_timeout_service:
            mock_timeout_service.return_value = MagicMock()
            self.flow_engine = FlowEngine(state_manager=self.mock_state_manager)
        
        self.metrics = PerformanceMetrics()
    
    async def simulate_user_conversation(self, user_id: str) -> Tuple[bool, float]:
        """Simulate a complete user conversation."""
        start_time = time.time()
        
        try:
            # Setup mock session for this user
            mock_session = MagicMock()
            mock_session.id = uuid.uuid4()
            mock_session.phone_number = f"5511{user_id[-8:]}"
            mock_session.current_step = "welcome"
            
            self.mock_state_manager.get_or_create_session.return_value = mock_session
            
            # Simulate conversation flow
            messages = [
                {"type": "text", "text": {"body": "Olá"}},
                {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "client_new", "title": "Sou Cliente Novo"}}},
                {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "area_civil", "title": "Direito Civil"}}},
                {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "schedule_yes", "title": "Sim, quero agendar"}}},
                {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "type_presencial", "title": "Presencial"}}}
            ]
            
            for message in messages:
                response = await self.flow_engine.process_message(
                    user_id=user_id,
                    phone_number=mock_session.phone_number,
                    message=message
                )
                
                # Small delay to simulate real user behavior
                await asyncio.sleep(0.01)
            
            end_time = time.time()
            return True, end_time - start_time
            
        except Exception as e:
            end_time = time.time()
            print(f"Error in user {user_id}: {str(e)}")
            return False, end_time - start_time
    
    @pytest.mark.asyncio
    async def test_concurrent_users_load(self):
        """Test system performance with concurrent users."""
        num_concurrent_users = 10
        
        print(f"\nTesting {num_concurrent_users} concurrent users...")
        
        self.metrics.start_time = time.time()
        
        # Create tasks for concurrent users
        tasks = []
        for i in range(num_concurrent_users):
            user_id = f"user_{i:04d}_{uuid.uuid4().hex[:8]}"
            task = self.simulate_user_conversation(user_id)
            tasks.append(task)
        
        # Execute all tasks concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        self.metrics.end_time = time.time()
        
        # Process results
        for result in results:
            if isinstance(result, Exception):
                self.metrics.record_error()
                print(f"Exception: {result}")
            else:
                success, duration = result
                if success:
                    self.metrics.record_success()
                    self.metrics.add_response_time(duration)
                else:
                    self.metrics.record_error()
        
        # Get statistics
        stats = self.metrics.get_statistics()
        
        print(f"✓ Concurrent load test completed:")
        print(f"  - Total users: {num_concurrent_users}")
        print(f"  - Success rate: {stats['success_rate']:.1f}%")
        print(f"  - Average conversation time: {stats.get('response_time_avg', 0):.3f}s")
        print(f"  - Max conversation time: {stats.get('response_time_max', 0):.3f}s")
        print(f"  - Operations per second: {stats['operations_per_second']:.2f}")
        
        # Assertions
        assert stats['success_rate'] >= 90, f"Success rate {stats['success_rate']:.1f}% below 90%"
        assert stats.get('response_time_max', 0) < 120, f"Max response time {stats.get('response_time_max', 0):.3f}s exceeds 2 minutes"
    
    @pytest.mark.asyncio
    async def test_high_message_volume(self):
        """Test system performance under high message volume."""
        num_messages = 100
        
        print(f"\nTesting high message volume ({num_messages} messages)...")
        
        self.metrics.start_time = time.time()
        
        # Setup single user session
        mock_session = MagicMock()
        mock_session.id = uuid.uuid4()
        mock_session.phone_number = "5511999999999"
        mock_session.current_step = "welcome"
        
        self.mock_state_manager.get_or_create_session.return_value = mock_session
        
        # Send many messages rapidly
        for i in range(num_messages):
            start_msg_time = time.time()
            
            try:
                message = {"type": "text", "text": {"body": f"Message {i}"}}
                response = await self.flow_engine.process_message(
                    user_id="high_volume_user",
                    phone_number="5511999999999",
                    message=message
                )
                
                end_msg_time = time.time()
                self.metrics.add_response_time(end_msg_time - start_msg_time)
                self.metrics.record_success()
                
            except Exception as e:
                self.metrics.record_error()
                print(f"Error processing message {i}: {str(e)}")
        
        self.metrics.end_time = time.time()
        
        # Get statistics
        stats = self.metrics.get_statistics()
        
        print(f"✓ High volume test completed:")
        print(f"  - Total messages: {num_messages}")
        print(f"  - Success rate: {stats['success_rate']:.1f}%")
        print(f"  - Average response time: {stats.get('response_time_avg', 0):.4f}s")
        print(f"  - Messages per second: {stats['operations_per_second']:.2f}")
        print(f"  - P95 response time: {stats.get('response_time_p95', 0):.4f}s")
        
        # Assertions
        assert stats['success_rate'] >= 95, f"Success rate {stats['success_rate']:.1f}% below 95%"
        assert stats.get('response_time_p95', 0) < 1.0, f"P95 response time {stats.get('response_time_p95', 0):.4f}s exceeds 1 second"
        assert stats['operations_per_second'] >= 10, f"Throughput {stats['operations_per_second']:.2f} msg/s below 10 msg/s"


class TestDatabasePerformance:
    """Test database performance and connection handling."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.mock_state_manager = AsyncMock(spec=StateManager)
        
        # Track database operation times
        self.db_operation_times = []
        
        async def mock_db_operation(*args, **kwargs):
            start_time = time.time()
            await asyncio.sleep(0.001)  # Simulate DB operation
            end_time = time.time()
            self.db_operation_times.append(end_time - start_time)
            return MagicMock()
        
        # Mock database operations with timing
        self.mock_state_manager.get_or_create_session = mock_db_operation
        self.mock_state_manager.update_conversation_data = mock_db_operation
        self.mock_state_manager.update_session_step = mock_db_operation
        self.mock_state_manager.record_analytics_event = mock_db_operation
        self.mock_state_manager.add_message = mock_db_operation
        
        with patch('app.services.flow_engine.get_timeout_service') as mock_timeout_service:
            mock_timeout_service.return_value = MagicMock()
            self.flow_engine = FlowEngine(state_manager=self.mock_state_manager)
    
    @pytest.mark.asyncio
    async def test_database_operation_performance(self):
        """Test database operation performance."""
        num_operations = 50
        
        print(f"\nTesting database performance ({num_operations} operations)...")
        
        # Simulate multiple database operations
        for i in range(num_operations):
            message = {"type": "text", "text": {"body": f"DB test {i}"}}
            
            await self.flow_engine.process_message(
                user_id=f"db_user_{i}",
                phone_number="5511999999999",
                message=message
            )
        
        # Analyze database operation times
        if self.db_operation_times:
            avg_db_time = statistics.mean(self.db_operation_times)
            max_db_time = max(self.db_operation_times)
            p95_db_time = sorted(self.db_operation_times)[int(len(self.db_operation_times) * 0.95)]
            
            print(f"✓ Database performance:")
            print(f"  - Average operation time: {avg_db_time*1000:.2f}ms")
            print(f"  - Max operation time: {max_db_time*1000:.2f}ms")
            print(f"  - P95 operation time: {p95_db_time*1000:.2f}ms")
            print(f"  - Total operations: {len(self.db_operation_times)}")
            
            # Assertions for database performance
            assert avg_db_time < 0.1, f"Average DB operation time {avg_db_time:.4f}s too slow"
            assert max_db_time < 0.5, f"Max DB operation time {max_db_time:.4f}s too slow"
    
    @pytest.mark.asyncio
    async def test_concurrent_database_access(self):
        """Test concurrent database access performance."""
        num_concurrent_ops = 20
        
        print(f"\nTesting concurrent database access ({num_concurrent_ops} concurrent operations)...")
        
        async def db_operation(op_id: int):
            message = {"type": "text", "text": {"body": f"Concurrent op {op_id}"}}
            
            start_time = time.time()
            await self.flow_engine.process_message(
                user_id=f"concurrent_user_{op_id}",
                phone_number="5511999999999",
                message=message
            )
            end_time = time.time()
            
            return end_time - start_time
        
        # Execute concurrent database operations
        start_time = time.time()
        tasks = [db_operation(i) for i in range(num_concurrent_ops)]
        operation_times = await asyncio.gather(*tasks)
        end_time = time.time()
        
        total_time = end_time - start_time
        avg_operation_time = statistics.mean(operation_times)
        max_operation_time = max(operation_times)
        
        print(f"✓ Concurrent database access:")
        print(f"  - Total time: {total_time:.3f}s")
        print(f"  - Average operation time: {avg_operation_time:.3f}s")
        print(f"  - Max operation time: {max_operation_time:.3f}s")
        print(f"  - Operations per second: {num_concurrent_ops/total_time:.2f}")
        
        # Assertions
        assert avg_operation_time < 1.0, f"Average concurrent operation time {avg_operation_time:.3f}s too slow"
        assert max_operation_time < 2.0, f"Max concurrent operation time {max_operation_time:.3f}s too slow"


class TestSystemResourceUsage:
    """Test system resource usage under load."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.mock_state_manager = AsyncMock(spec=StateManager)
        
        # Configure mocks
        self.mock_state_manager.get_or_create_session = AsyncMock(return_value=MagicMock())
        self.mock_state_manager.update_conversation_data = AsyncMock()
        self.mock_state_manager.update_session_step = AsyncMock()
        self.mock_state_manager.record_analytics_event = AsyncMock()
        self.mock_state_manager.add_message = AsyncMock()
        
        with patch('app.services.flow_engine.get_timeout_service') as mock_timeout_service:
            mock_timeout_service.return_value = MagicMock()
            self.flow_engine = FlowEngine(state_manager=self.mock_state_manager)
    
    @pytest.mark.asyncio
    async def test_memory_usage_under_load(self):
        """Test memory usage under sustained load."""
        # Use resource module for memory tracking
        initial_memory = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        if sys.platform == 'darwin':  # macOS reports in bytes
            initial_memory = initial_memory / 1024 / 1024  # Convert to MB
        else:  # Linux reports in KB
            initial_memory = initial_memory / 1024  # Convert to MB
        
        print(f"\nTesting memory usage under load...")
        print(f"Initial memory: {initial_memory:.2f}MB")
        
        # Simulate sustained load
        num_iterations = 100
        memory_samples = []
        
        for i in range(num_iterations):
            # Process message
            message = {"type": "text", "text": {"body": f"Load test {i}"}}
            await self.flow_engine.process_message(
                user_id=f"load_user_{i}",
                phone_number="5511999999999",
                message=message
            )
            
            # Sample memory every 10 iterations
            if i % 10 == 0:
                current_memory = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
                if sys.platform == 'darwin':  # macOS reports in bytes
                    current_memory = current_memory / 1024 / 1024  # Convert to MB
                else:  # Linux reports in KB
                    current_memory = current_memory / 1024  # Convert to MB
                memory_samples.append(current_memory)
        
        # Force garbage collection
        gc.collect()
        final_memory = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        if sys.platform == 'darwin':  # macOS reports in bytes
            final_memory = final_memory / 1024 / 1024  # Convert to MB
        else:  # Linux reports in KB
            final_memory = final_memory / 1024  # Convert to MB
        
        max_memory = max(memory_samples) if memory_samples else final_memory
        memory_increase = final_memory - initial_memory
        peak_increase = max_memory - initial_memory
        
        print(f"✓ Memory usage under load:")
        print(f"  - Final memory: {final_memory:.2f}MB")
        print(f"  - Memory increase: {memory_increase:.2f}MB")
        print(f"  - Peak memory increase: {peak_increase:.2f}MB")
        print(f"  - Memory per operation: {memory_increase/num_iterations*1024:.2f}KB")
        
        # Assertions
        assert memory_increase < 100, f"Memory increase {memory_increase:.2f}MB too high"
        assert peak_increase < 150, f"Peak memory increase {peak_increase:.2f}MB too high"
    
    def test_cpu_usage_monitoring(self):
        """Test CPU usage monitoring capabilities."""
        import os
        
        # Get basic system info
        cpu_count = os.cpu_count()
        
        print(f"\n✓ System monitoring capability:")
        print(f"  - CPU count: {cpu_count}")
        print(f"  - Platform: {sys.platform}")
        
        # Basic system checks
        assert cpu_count > 0, "CPU count should be positive"
        assert sys.platform in ['darwin', 'linux', 'win32'], "Should run on supported platform"


def run_performance_tests():
    """Run all performance tests."""
    print("Running Performance and Load Tests...")
    print("=" * 60)
    
    # Test classes to run
    test_classes = [
        TestPerformanceBaseline,
        TestConcurrentLoad,
        TestDatabasePerformance,
        TestSystemResourceUsage
    ]
    
    total_tests = 0
    passed_tests = 0
    failed_tests = 0
    
    for test_class in test_classes:
        print(f"\n--- {test_class.__name__} ---")
        
        test_instance = test_class()
        test_instance.setup_method()
        
        # Get test methods
        test_methods = [method for method in dir(test_instance) 
                       if method.startswith('test_') and callable(getattr(test_instance, method))]
        
        for method_name in test_methods:
            total_tests += 1
            test_method = getattr(test_instance, method_name)
            
            try:
                if asyncio.iscoroutinefunction(test_method):
                    asyncio.run(test_method())
                else:
                    test_method()
                
                passed_tests += 1
                print(f"✓ {method_name}")
                
            except Exception as e:
                failed_tests += 1
                print(f"✗ {method_name}: {str(e)}")
    
    print("\n" + "=" * 60)
    print(f"Performance Test Summary:")
    print(f"  Total tests: {total_tests}")
    print(f"  Passed: {passed_tests}")
    print(f"  Failed: {failed_tests}")
    print(f"  Success rate: {(passed_tests/total_tests)*100:.1f}%")
    
    if failed_tests == 0:
        print("🎉 All performance tests passed!")
    else:
        print(f"⚠️  {failed_tests} performance tests need attention")
    
    return passed_tests, failed_tests


if __name__ == "__main__":
    run_performance_tests()