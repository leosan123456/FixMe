const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('./database');

const API_KEY = 'AIzaSyA50zA8UG_ts-Iy1K3drPxAndF39hXkuSY';
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

class AIOptimizer {
  constructor() {
    this.conversationHistory = [];
    this.systemPrompt = this.buildSystemPrompt();
  }

  buildSystemPrompt() {
    return `Você é um especialista em otimização de sistemas Windows 10/11 focado em jogos. 
Sua tarefa é analisar dados de hardware e sugerir as melhores otimizações personalizadas.
Considere:
- Capacidade de CPU (cores, frequência)
- Quantidade de RAM disponível
- GPU presente ou integrada
- Carga atual do sistema
- Histórico de otimizações que funcionaram bem

Forneça recomendações práticas, seguras e eficazes. Sempre priorize estabilidade sobre performance pura.
Evite sugestões que possam danificar o sistema ou exigir modificações de BIOS.

Formato de resposta:
- Sempre estruture como JSON quando pedido
- Seja conciso e específico
- Indique nível de prioridade (crítico, alto, médio, baixo)
- Explique o impacto esperado`;
  }

  async getSmartRecommendations(hwStats, hwProfile, optimizationHistory) {
    try {
      const prompt = this.buildPromptForRecommendations(hwStats, hwProfile, optimizationHistory);
      
      this.conversationHistory.push({
        role: 'user',
        parts: [{ text: prompt }]
      });

      const response = await model.generateContent({
        contents: this.conversationHistory
      });

      const text = response.response.text();
      this.conversationHistory.push({
        role: 'model',
        parts: [{ text }]
      });

      // Tentar extrair JSON da resposta
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return this.parseTextResponse(text);
    } catch (err) {
      console.error('Erro na IA:', err);
      throw err;
    }
  }

  buildPromptForRecommendations(hwStats, hwProfile, history) {
    const lastOptimizations = history.slice(-5);
    const successRate = db.getSuccessRate();

    return `Análise de Hardware e Recomendações Inteligentes:

HARDWARE DO USUÁRIO:
- CPU: ${hwProfile.cpuModel || 'desconhecido'} (${hwProfile.cpuCores} cores)
- RAM: ${hwProfile.totalMemory || 'desconhecido'} GB
- GPU: ${hwProfile.gpuModel || 'Integrada'}
- SO: ${hwProfile.os || 'Windows 10/11'}

ESTADO ATUAL:
- CPU em uso: ${hwStats.cpu.current}%
- Memória em uso: ${hwStats.memory.current}%
- GPU em uso: ${hwStats.gpu.current}%
- Processos ativos: ${hwStats.processCount}

HISTÓRICO DE SUCESSO:
- Taxa de sucesso geral: ${successRate.toFixed(2)}%
- Últimas otimizações: ${lastOptimizations.map(o => o.optimization_type).join(', ')}

Por favor, forneça recomendações em formato JSON com a seguinte estrutura:
{
  "recommendations": [
    {
      "type": "tipo_otimizacao",
      "description": "descrição",
      "priority": "crítico|alto|médio|baixo",
      "expectedImprovement": "% esperado",
      "command": "comando_a_executar_se_aplicável"
    }
  ],
  "overallAssessment": "avaliação geral do sistema"
}`;
  }

  parseTextResponse(text) {
    // Fallback para quando a API não retorna JSON puro
    return {
      recommendations: [],
      overallAssessment: text.substring(0, 500)
    };
  }

  async learnFromFeedback(optimizationId, rating, comment) {
    try {
      db.recordUserFeedback(optimizationId, rating, comment);

      // Alimentar feedback para melhorar recomendações futuras
      const prompt = `O usuário forneceu feedback sobre uma otimização:
Avaliação: ${rating}/5
Comentário: ${comment}

Use isso para aprender qual tipo de otimização funciona melhor para este sistema.`;

      this.conversationHistory.push({
        role: 'user',
        parts: [{ text: prompt }]
      });

      const response = await model.generateContent({
        contents: this.conversationHistory
      });

      this.conversationHistory.push({
        role: 'model',
        parts: [{ text: response.response.text() }]
      });

      return true;
    } catch (err) {
      console.error('Erro ao registrar feedback:', err);
      return false;
    }
  }

  async suggestGameOptimization(gameName, hwProfile) {
    try {
      const prompt = `Forneça otimizações específicas para o jogo "${gameName}" em um sistema com:
- ${hwProfile.cpuCores} cores de CPU
- ${hwProfile.totalMemory} GB de RAM
- GPU: ${hwProfile.gpuModel || 'integrada'}

Retorne em JSON format com configurações recomendadas e tweaks específicos para este jogo.`;

      this.conversationHistory.push({
        role: 'user',
        parts: [{ text: prompt }]
      });

      const response = await model.generateContent({
        contents: this.conversationHistory
      });

      const text = response.response.text();
      this.conversationHistory.push({
        role: 'model',
        parts: [{ text }]
      });

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { suggestions: text };
    } catch (err) {
      console.error('Erro ao sugerir otimização de jogo:', err);
      throw err;
    }
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}

module.exports = AIOptimizer;
