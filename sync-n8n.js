const fs = require('fs');
const path = require('path');

// Carrega variáveis do .env.local
require('dotenv').config({ path: '.env.local' });

const N8N_URL = 'https://servidor-n8n.bkbfzi.easypanel.host';
const N8N_API_KEY = process.env.N8N_API_KEY;

// Filtro por projeto (a API do n8n não suporta filtro por pasta)
const PROJECT_ID = 'FWsbftV72EohSG3v';

const WORKFLOWS_DIR = path.join(__dirname, 'n8n-workflows');

async function syncWorkflows() {
  // Verifica se a API key existe
  if (!N8N_API_KEY) {
    console.error('❌ Erro: N8N_API_KEY não encontrada.');
    console.error('   Crie um arquivo .env.local com:');
    console.error('   N8N_API_KEY=sua_api_key_aqui');
    process.exit(1);
  }

  console.log('🔄 Sincronizando workflows do n8n...');
  console.log(`📂 Projeto: ${PROJECT_ID}\n`);

  // Cria pasta se não existir
  if (!fs.existsSync(WORKFLOWS_DIR)) {
    fs.mkdirSync(WORKFLOWS_DIR, { recursive: true });
    console.log('📁 Pasta n8n-workflows criada\n');
  }

  try {
    // Busca todos os workflows
    const response = await fetch(`${N8N_URL}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const allWorkflows = data.data || [];

    console.log(`📋 Total de workflows no n8n: ${allWorkflows.length}`);

    // Filtra por projeto (projectId está em shared[].projectId)
    const workflows = allWorkflows.filter(wf => {
      const sharedProject = wf.shared?.find(s => s.projectId === PROJECT_ID);
      return !!sharedProject;
    });

    console.log(`📋 Workflows no projeto: ${workflows.length}\n`);

    if (workflows.length === 0) {
      console.log(`⚠️  Nenhum workflow encontrado no projeto ${PROJECT_ID}`);
      return;
    }

    // Limpa arquivos JSON antigos (mantém README.md)
    const existingFiles = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.json'));
    existingFiles.forEach(file => {
      fs.unlinkSync(path.join(WORKFLOWS_DIR, file));
    });

    // Baixa cada workflow completo
    const workflowList = [];

    for (const wf of workflows) {
      const fullResponse = await fetch(`${N8N_URL}/api/v1/workflows/${wf.id}`, {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Accept': 'application/json'
        }
      });

      if (!fullResponse.ok) {
        console.log(`⚠️  Erro ao baixar: ${wf.name}`);
        continue;
      }

      const fullWorkflow = await fullResponse.json();

      // Gera nome do arquivo (slug)
      const fileName = wf.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove acentos
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') + '.json';

      const filePath = path.join(WORKFLOWS_DIR, fileName);

      fs.writeFileSync(filePath, JSON.stringify(fullWorkflow, null, 2), 'utf8');

      const status = wf.active ? '🟢 ativo' : '⚪ inativo';
      console.log(`✅ ${wf.name} (${status}) → ${fileName}`);

      workflowList.push({
        name: wf.name,
        file: fileName,
        active: wf.active,
        id: wf.id,
        nodes: fullWorkflow.nodes?.length || 0
      });
    }

    // Gera README
    const readme = generateReadme(workflowList);
    fs.writeFileSync(path.join(WORKFLOWS_DIR, 'README.md'), readme, 'utf8');

    console.log('\n📄 README.md atualizado');
    console.log(`\n✨ Sincronização concluída! ${workflows.length} workflows baixados.`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

function generateReadme(workflows) {
  const activeWorkflows = workflows.filter(w => w.active);
  const inactiveWorkflows = workflows.filter(w => !w.active);

  let content = `# Workflows n8n - Vertix

Esta pasta contém os workflows exportados do n8n para referência e versionamento.

**URL do n8n:** ${N8N_URL}
**Projeto:** ${PROJECT_ID}

**Última sincronização:** ${new Date().toLocaleString('pt-BR')}

---

## Workflows Ativos (${activeWorkflows.length})

| Workflow | Arquivo | Nodes |
|----------|---------|-------|
`;

  activeWorkflows.forEach(w => {
    content += `| ${w.name} | \`${w.file}\` | ${w.nodes} |\n`;
  });

  if (inactiveWorkflows.length > 0) {
    content += `
## Workflows Inativos (${inactiveWorkflows.length})

| Workflow | Arquivo | Nodes |
|----------|---------|-------|
`;
    inactiveWorkflows.forEach(w => {
      content += `| ${w.name} | \`${w.file}\` | ${w.nodes} |\n`;
    });
  }

  content += `
---

## Como usar

### Sincronizar workflows

\`\`\`bash
npm run sync-n8n
\`\`\`

### Importar no n8n

1. Acesse ${N8N_URL}
2. Vá em "Workflows" → "Import from File"
3. Selecione o arquivo .json desejado

---

*Gerado automaticamente por sync-n8n.js*
`;

  return content;
}

syncWorkflows();
