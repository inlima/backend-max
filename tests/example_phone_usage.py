#!/usr/bin/env python3
"""
Example of how to use the phone formatting functions.
"""

from app.services.whatsapp_client import format_phone_number, is_valid_brazilian_phone

def demonstrate_phone_formatting():
    """Demonstrate phone number formatting with real examples."""
    
    print("=== Phone Number Formatting Examples ===\n")
    
    # Common input formats you might receive
    examples = [
        "557382005612",      # Your specific example
        "73 98200-5612",     # User types with formatting
        "(73) 98200-5612",   # User types with parentheses
        "11 99999-9999",     # São Paulo number
        "21987654321",       # Rio number without country code
        "+55 11 98765-4321", # International format
    ]
    
    for phone in examples:
        formatted = format_phone_number(phone)
        is_valid = is_valid_brazilian_phone(phone)
        status = "✅ Valid" if is_valid else "❌ Invalid"
        
        print(f"Input:     {phone}")
        print(f"Formatted: {formatted}")
        print(f"Status:    {status}")
        print("-" * 40)

if __name__ == "__main__":
    demonstrate_phone_formatting()