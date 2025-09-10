import { renderHook, act, waitFor } from '@testing-library/react'
import { useBulkOperations } from '@/hooks/use-bulk-operations'
import { mockContato, mockProcesso } from '../utils/test-utils'

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  apiClient: {
    bulkUpdateContatos: jest.fn(),
    bulkUpdateProcessos: jest.fn(),
    bulkDeleteContatos: jest.fn(),
    bulkDeleteProcessos: jest.fn(),
  },
}))

const mockApiClient = require('@/lib/api-client').apiClient

describe('useBulkOperations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('contatos bulk operations', () => {
    it('performs bulk status update for contatos', async () => {
      mockApiClient.bulkUpdateContatos.mockResolvedValue({ success: true })

      const { result } = renderHook(() => useBulkOperations('contatos'))

      await act(async () => {
        await result.current.bulkUpdateStatus(['1', '2'], 'qualificado')
      })

      expect(mockApiClient.bulkUpdateContatos).toHaveBeenCalledWith({
        ids: ['1', '2'],
        updates: { status: 'qualificado' },
      })
    })

    it('performs bulk delete for contatos', async () => {
      mockApiClient.bulkDeleteContatos.mockResolvedValue({ success: true })

      const { result } = renderHook(() => useBulkOperations('contatos'))

      await act(async () => {
        await result.current.bulkDelete(['1', '2'])
      })

      expect(mockApiClient.bulkDeleteContatos).toHaveBeenCalledWith(['1', '2'])
    })

    it('performs bulk tag assignment for contatos', async () => {
      mockApiClient.bulkUpdateContatos.mockResolvedValue({ success: true })

      const { result } = renderHook(() => useBulkOperations('contatos'))

      await act(async () => {
        await result.current.bulkAssignTags(['1', '2'], ['VIP', 'Urgente'])
      })

      expect(mockApiClient.bulkUpdateContatos).toHaveBeenCalledWith({
        ids: ['1', '2'],
        updates: { tags: ['VIP', 'Urgente'] },
      })
    })

    it('performs bulk favorite toggle for contatos', async () => {
      mockApiClient.bulkUpdateContatos.mockResolvedValue({ success: true })

      const { result } = renderHook(() => useBulkOperations('contatos'))

      await act(async () => {
        await result.current.bulkToggleFavorite(['1', '2'], true)
      })

      expect(mockApiClient.bulkUpdateContatos).toHaveBeenCalledWith({
        ids: ['1', '2'],
        updates: { favorito: true },
      })
    })
  })

  describe('processos bulk operations', () => {
    it('performs bulk status update for processos', async () => {
      mockApiClient.bulkUpdateProcessos.mockResolvedValue({ success: true })

      const { result } = renderHook(() => useBulkOperations('processos'))

      await act(async () => {
        await result.current.bulkUpdateStatus(['1', '2'], 'finalizado')
      })

      expect(mockApiClient.bulkUpdateProcessos).toHaveBeenCalledWith({
        ids: ['1', '2'],
        updates: { status: 'finalizado' },
      })
    })

    it('performs bulk advogado assignment for processos', async () => {
      mockApiClient.bulkUpdateProcessos.mockResolvedValue({ success: true })

      const { result } = renderHook(() => useBulkOperations('processos'))

      await act(async () => {
        await result.current.bulkAssignAdvogado(['1', '2'], 'Dr. João Silva')
      })

      expect(mockApiClient.bulkUpdateProcessos).toHaveBeenCalledWith({
        ids: ['1', '2'],
        updates: { advogadoResponsavel: 'Dr. João Silva' },
      })
    })

    it('performs bulk priority update for processos', async () => {
      mockApiClient.bulkUpdateProcessos.mockResolvedValue({ success: true })

      const { result } = renderHook(() => useBulkOperations('processos'))

      await act(async () => {
        await result.current.bulkUpdatePriority(['1', '2'], 'alta')
      })

      expect(mockApiClient.bulkUpdateProcessos).toHaveBeenCalledWith({
        ids: ['1', '2'],
        updates: { prioridade: 'alta' },
      })
    })
  })

  describe('loading states', () => {
    it('tracks loading state during bulk operations', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockApiClient.bulkUpdateContatos.mockReturnValue(promise)

      const { result } = renderHook(() => useBulkOperations('contatos'))

      expect(result.current.isLoading).toBe(false)

      act(() => {
        result.current.bulkUpdateStatus(['1'], 'qualificado')
      })

      expect(result.current.isLoading).toBe(true)

      await act(async () => {
        resolvePromise({ success: true })
        await promise
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('error handling', () => {
    it('handles API errors correctly', async () => {
      const error = new Error('Bulk operation failed')
      mockApiClient.bulkUpdateContatos.mockRejectedValue(error)

      const { result } = renderHook(() => useBulkOperations('contatos'))

      await act(async () => {
        try {
          await result.current.bulkUpdateStatus(['1'], 'qualificado')
        } catch (e) {
          expect(e).toEqual(error)
        }
      })

      expect(result.current.error).toEqual(error)
      expect(result.current.isLoading).toBe(false)
    })

    it('resets error state on successful operation', async () => {
      const error = new Error('Previous error')
      mockApiClient.bulkUpdateContatos
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ success: true })

      const { result } = renderHook(() => useBulkOperations('contatos'))

      // First operation fails
      await act(async () => {
        try {
          await result.current.bulkUpdateStatus(['1'], 'qualificado')
        } catch (e) {
          // Expected error
        }
      })

      expect(result.current.error).toEqual(error)

      // Second operation succeeds
      await act(async () => {
        await result.current.bulkUpdateStatus(['1'], 'qualificado')
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('progress tracking', () => {
    it('tracks progress for large bulk operations', async () => {
      const mockProgress = jest.fn()
      mockApiClient.bulkUpdateContatos.mockImplementation(async ({ ids }) => {
        for (let i = 0; i < ids.length; i++) {
          mockProgress((i + 1) / ids.length * 100)
          await new Promise(resolve => setTimeout(resolve, 10))
        }
        return { success: true }
      })

      const { result } = renderHook(() => useBulkOperations('contatos'))

      await act(async () => {
        await result.current.bulkUpdateStatus(['1', '2', '3', '4', '5'], 'qualificado')
      })

      expect(result.current.progress).toBe(100)
    })
  })

  describe('undo functionality', () => {
    it('provides undo functionality for bulk operations', async () => {
      mockApiClient.bulkUpdateContatos.mockResolvedValue({ success: true })

      const { result } = renderHook(() => useBulkOperations('contatos'))

      await act(async () => {
        await result.current.bulkUpdateStatus(['1', '2'], 'qualificado')
      })

      expect(result.current.canUndo).toBe(true)
      expect(result.current.lastOperation).toEqual({
        type: 'bulkUpdateStatus',
        ids: ['1', '2'],
        previousValues: expect.any(Object),
      })

      await act(async () => {
        await result.current.undo()
      })

      expect(mockApiClient.bulkUpdateContatos).toHaveBeenCalledTimes(2)
    })
  })
})