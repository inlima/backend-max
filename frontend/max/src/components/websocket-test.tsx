'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useWebSocket } from "@/providers/websocket-provider"
import { Contato, Processo } from "@/types"

/**
 * Test component to simulate WebSocket events
 * This is for development/testing purposes only
 */
export function WebSocketTest() {
  const { socket, isConnected, connectionStatus } = useWebSocket()

  const simulateNovoContato = () => {
    if (!socket) return

    const mockContato: Contato = {
      id: `contato-${Date.now()}`,
      nome: "João Silva",
      telefone: "+5511999999999",
      email: "joao@email.com",
      status: "novo",
      origem: "whatsapp",
      areaInteresse: "Direito Civil",
      tipoSolicitacao: "consulta",
      preferenciaAtendimento: "presencial",
      primeiroContato: new Date(),
      ultimaInteracao: new Date(),
      mensagensNaoLidas: 1,
      dadosColetados: {
        clienteType: "novo",
        practiceArea: "Direito Civil",
        schedulingPreference: "presencial",
        wantsScheduling: true,
        customRequests: ["Consulta sobre divórcio"]
      },
      conversaCompleta: false
    }

    socket.emit('novo_contato', mockContato)
  }

  const simulateContatoAtualizado = () => {
    if (!socket) return

    const mockContato: Contato = {
      id: "contato-123",
      nome: "Maria Santos",
      telefone: "+5511888888888",
      status: "em_atendimento",
      origem: "whatsapp",
      primeiroContato: new Date(Date.now() - 86400000), // 1 day ago
      ultimaInteracao: new Date(),
      mensagensNaoLidas: 0,
      dadosColetados: {
        clienteType: "existente",
        practiceArea: "Direito Trabalhista",
        customRequests: []
      },
      conversaCompleta: true
    }

    socket.emit('contato_atualizado', mockContato)
  }

  const simulateProcessoAtualizado = () => {
    if (!socket) return

    const mockProcesso: Processo = {
      id: `processo-${Date.now()}`,
      numero: "1234567-89.2024.8.26.0001",
      titulo: "Ação Trabalhista - Horas Extras",
      descricao: "Reclamação trabalhista para cobrança de horas extras",
      contatoId: "contato-123",
      contato: {
        nome: "Maria Santos",
        telefone: "+5511888888888"
      },
      areaJuridica: "Direito Trabalhista",
      status: "em_andamento",
      prioridade: "media",
      origem: "whatsapp",
      advogadoResponsavel: "Dr. Carlos Oliveira",
      dataAbertura: new Date(Date.now() - 172800000), // 2 days ago
      dataUltimaAtualizacao: new Date(),
      documentos: [],
      historico: []
    }

    socket.emit('processo_atualizado', mockProcesso)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>WebSocket Test</CardTitle>
        <CardDescription>
          Status: {connectionStatus} | Connected: {isConnected ? 'Yes' : 'No'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button 
          onClick={simulateNovoContato}
          disabled={!isConnected}
          className="w-full"
        >
          Simular Novo Contato
        </Button>
        <Button 
          onClick={simulateContatoAtualizado}
          disabled={!isConnected}
          variant="outline"
          className="w-full"
        >
          Simular Contato Atualizado
        </Button>
        <Button 
          onClick={simulateProcessoAtualizado}
          disabled={!isConnected}
          variant="outline"
          className="w-full"
        >
          Simular Processo Atualizado
        </Button>
      </CardContent>
    </Card>
  )
}