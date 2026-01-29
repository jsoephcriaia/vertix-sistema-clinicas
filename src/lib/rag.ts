/**
 * Funções utilitárias para o sistema RAG (Retrieval Augmented Generation)
 * Usadas para disparar a reindexação quando dados da clínica são alterados
 */

/**
 * Dispara a reindexação dos dados da clínica no sistema RAG
 * Chamado automaticamente após alterações em:
 * - Procedimentos
 * - FAQ
 * - Políticas
 *
 * A reindexação é feita em background e não bloqueia a UI
 * Usa API route local para evitar problemas de CORS
 */
export async function triggerRAGReindex(clinicaId: string): Promise<void> {
  if (!clinicaId) {
    console.warn('RAG: clinicaId não fornecido, ignorando reindexação');
    return;
  }

  try {
    // Usa API route local para evitar CORS
    fetch('/api/rag/reindex', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ clinica_id: clinicaId }),
    })
      .then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          console.log('RAG: Reindexação disparada com sucesso', data);
        } else {
          console.error('RAG: Erro na reindexação', response.status);
        }
      })
      .catch((error) => {
        // Não propagamos o erro para não afetar a UX
        console.error('RAG: Falha ao disparar reindexação', error);
      });
  } catch (error) {
    console.error('RAG: Erro ao preparar reindexação', error);
  }
}
