/**
 * Normaliza telefone para formato internacional (+5511999999999)
 *
 * @example
 * normalizePhone('11987654321')     → '+5511987654321'
 * normalizePhone('+5511987654321')  → '+5511987654321'
 * normalizePhone('(11) 98765-4321') → '+5511987654321'
 * normalizePhone('011987654321')    → '+5511987654321'
 */
export function normalizePhone(phone: string): string {
  // Remove tudo que não é número
  let cleaned = phone.replace(/\D/g, '');

  // Remove 0 inicial se houver (prefixo de discagem)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  // Adiciona código do país se não tiver
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }

  return '+' + cleaned;
}

/**
 * Formata telefone para exibição (11) 98765-4321
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  // Remove 55 se tiver
  const local = cleaned.startsWith('55') ? cleaned.slice(2) : cleaned;

  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }

  return phone;
}
