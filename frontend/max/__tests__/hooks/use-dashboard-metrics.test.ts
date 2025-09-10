import { renderHook, waitFor } from '@testing-library/react'
import { useDashboardMetrics } from '@/hooks/use-dashboard-metrics'
import { mockDashboardMetrics } from '../utils/test-utils'

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  apiClient: {
    getDashboardMetrics: jest.fn(),
  },
}))

const mockApiClient = require('@/lib/api-client').apiClient

describe('useDashboardMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('fetches dashboard metrics successfully', async () => {
    mockApiClient.getDashboardMetrics.mockResolvedValue(mockDashboardMetrics)

    const { result } = renderHook(() => useDashboardMetrics())

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockDashboardMetrics)
    expect(result.current.error).toBeNull()
  })

  it('handles API errors correctly', async () => {
    const error = new Error('Failed to fetch metrics')
    mockApiClient.getDashboardMetrics.mockRejectedValue(error)

    const { result } = renderHook(() => useDashboardMetrics())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toBeUndefined()
    expect(result.current.error).toEqual(error)
  })

  it('refetches data when refetch is called', async () => {
    mockApiClient.getDashboardMetrics.mockResolvedValue(mockDashboardMetrics)

    const { result } = renderHook(() => useDashboardMetrics())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockApiClient.getDashboardMetrics).toHaveBeenCalledTimes(1)

    result.current.refetch()

    await waitFor(() => {
      expect(mockApiClient.getDashboardMetrics).toHaveBeenCalledTimes(2)
    })
  })

  it('applies date range filter correctly', async () => {
    mockApiClient.getDashboardMetrics.mockResolvedValue(mockDashboardMetrics)

    const { result } = renderHook(() => 
      useDashboardMetrics({ dateRange: '7d' })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockApiClient.getDashboardMetrics).toHaveBeenCalledWith({
      dateRange: '7d',
    })
  })

  it('caches data correctly', async () => {
    mockApiClient.getDashboardMetrics.mockResolvedValue(mockDashboardMetrics)

    const { result: result1 } = renderHook(() => useDashboardMetrics())
    const { result: result2 } = renderHook(() => useDashboardMetrics())

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false)
      expect(result2.current.isLoading).toBe(false)
    })

    // Should only call API once due to caching
    expect(mockApiClient.getDashboardMetrics).toHaveBeenCalledTimes(1)
    expect(result1.current.data).toEqual(result2.current.data)
  })

  it('handles network errors gracefully', async () => {
    const networkError = new Error('Network error')
    networkError.name = 'NetworkError'
    mockApiClient.getDashboardMetrics.mockRejectedValue(networkError)

    const { result } = renderHook(() => useDashboardMetrics())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toEqual(networkError)
    expect(result.current.data).toBeUndefined()
  })

  it('retries failed requests', async () => {
    mockApiClient.getDashboardMetrics
      .mockRejectedValueOnce(new Error('Temporary error'))
      .mockResolvedValue(mockDashboardMetrics)

    const { result } = renderHook(() => 
      useDashboardMetrics({ retry: 1 })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockApiClient.getDashboardMetrics).toHaveBeenCalledTimes(2)
    expect(result.current.data).toEqual(mockDashboardMetrics)
  })

  it('calculates growth percentages correctly', async () => {
    const metricsWithGrowth = {
      ...mockDashboardMetrics,
      totalContatosGrowth: 15.5,
      processosAtivosGrowth: -5.2,
    }
    mockApiClient.getDashboardMetrics.mockResolvedValue(metricsWithGrowth)

    const { result } = renderHook(() => useDashboardMetrics())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data?.totalContatosGrowth).toBe(15.5)
    expect(result.current.data?.processosAtivosGrowth).toBe(-5.2)
  })
})