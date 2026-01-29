/**
 * Cliente para a API Platform do Chatwoot
 * Usado para criar accounts, users e inboxes automaticamente
 */

interface ChatwootAccount {
  id: number;
  name: string;
}

interface ChatwootUser {
  id: number;
  email: string;
  name: string;
  access_token?: string;
}

interface ChatwootInbox {
  id: number;
  name: string;
  channel_type: string;
}

interface ChatwootAccountUser {
  id: number;
  user_id: number;
  account_id: number;
  role: string;
}

interface ChatwootWebhook {
  id: number;
  url: string;
  subscriptions: string[];
}

interface ChatwootLabel {
  id: number;
  title: string;
  color: string;
}

export class ChatwootAdminClient {
  private baseUrl: string;
  private platformToken: string;

  constructor() {
    this.baseUrl = process.env.CHATWOOT_PLATFORM_URL || '';
    this.platformToken = process.env.CHATWOOT_PLATFORM_TOKEN || '';

    if (!this.baseUrl || !this.platformToken) {
      console.warn('CHATWOOT_PLATFORM_URL ou CHATWOOT_PLATFORM_TOKEN não configurados');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': this.platformToken,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chatwoot API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Cria uma nova conta (account) no Chatwoot
   */
  async createAccount(name: string): Promise<ChatwootAccount> {
    return this.request<ChatwootAccount>('/platform/api/v1/accounts', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  /**
   * Cria um novo usuário na plataforma
   */
  async createUser(email: string, name: string, password: string): Promise<ChatwootUser> {
    return this.request<ChatwootUser>('/platform/api/v1/users', {
      method: 'POST',
      body: JSON.stringify({
        email,
        name,
        password,
        custom_attributes: {},
      }),
    });
  }

  /**
   * Atualiza o locale de um usuário (chamada direta à API do account)
   */
  async updateUserLocale(accountId: number, userToken: string, locale: string = 'pt_BR'): Promise<void> {
    const url = `${this.baseUrl}/api/v1/profile`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': userToken,
      },
      body: JSON.stringify({
        profile: {
          locale,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chatwoot Profile API Error: ${response.status} - ${errorText}`);
    }
  }

  /**
   * Vincula um usuário a uma conta com uma role específica
   */
  async addUserToAccount(
    accountId: number,
    userId: number,
    role: 'administrator' | 'agent' = 'administrator'
  ): Promise<ChatwootAccountUser> {
    return this.request<ChatwootAccountUser>(
      `/platform/api/v1/accounts/${accountId}/account_users`,
      {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, role }),
      }
    );
  }

  /**
   * Obtém o access token de um usuário específico
   */
  async getUserAccessToken(userId: number): Promise<string> {
    const user = await this.request<ChatwootUser>(`/platform/api/v1/users/${userId}`);
    return user.access_token || '';
  }

  /**
   * Cria um inbox do tipo API (para integração com WhatsApp via UAZAPI)
   * Nota: Esta chamada usa o token do usuário, não o token da plataforma
   */
  async createApiInbox(
    accountId: number,
    userToken: string,
    name: string,
    webhookUrl: string
  ): Promise<ChatwootInbox> {
    const url = `${this.baseUrl}/api/v1/accounts/${accountId}/inboxes`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': userToken,
      },
      body: JSON.stringify({
        name,
        channel: {
          type: 'api',
          webhook_url: webhookUrl,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chatwoot API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Cria um webhook para a conta (para receber eventos do Chatwoot)
   * Nota: Esta chamada usa o token do usuário, não o token da plataforma
   */
  async createWebhook(
    accountId: number,
    userToken: string,
    webhookUrl: string,
    subscriptions: string[] = [
      'message_created',
      'message_updated',
      'conversation_created',
      'conversation_status_changed',
      'conversation_updated'
    ]
  ): Promise<ChatwootWebhook> {
    const url = `${this.baseUrl}/api/v1/accounts/${accountId}/webhooks`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': userToken,
      },
      body: JSON.stringify({
        url: webhookUrl,
        subscriptions,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chatwoot Webhook API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Cria uma label para a conta
   * Nota: Esta chamada usa o token do usuário, não o token da plataforma
   */
  async createLabel(
    accountId: number,
    userToken: string,
    title: string,
    color: string = '#FF0000'
  ): Promise<ChatwootLabel> {
    const url = `${this.baseUrl}/api/v1/accounts/${accountId}/labels`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': userToken,
      },
      body: JSON.stringify({
        title,
        description: '',
        color,
        show_on_sidebar: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chatwoot Label API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Fluxo completo de criação de clínica no Chatwoot
   * Retorna todos os dados necessários para salvar na clínica
   */
  async setupClinica(
    clinicaName: string,
    userEmail: string,
    userName: string,
    userPassword: string,
    webhookUrl: string
  ): Promise<{
    accountId: number;
    userId: number;
    inboxId: number;
    apiToken: string;
  }> {
    // 1. Criar account
    console.log('Criando account no Chatwoot...');
    const account = await this.createAccount(clinicaName);
    console.log('Account criado:', account.id);

    // 2. Criar user
    console.log('Criando user no Chatwoot...');
    const user = await this.createUser(userEmail, userName, userPassword);
    console.log('User criado:', user.id);

    // 3. Vincular user ao account como admin
    console.log('Vinculando user ao account...');
    await this.addUserToAccount(account.id, user.id, 'administrator');
    console.log('User vinculado ao account');

    // 4. Obter token do user
    console.log('Obtendo token do user...');
    const apiToken = await this.getUserAccessToken(user.id);
    console.log('Token obtido');

    // 5. Atualizar locale do usuário para português
    console.log('Configurando idioma pt_BR...');
    try {
      await this.updateUserLocale(account.id, apiToken, 'pt_BR');
      console.log('Idioma configurado');
    } catch (localeError) {
      console.warn('Aviso: Não foi possível configurar idioma:', localeError);
    }

    // 6. Criar inbox
    console.log('Criando inbox WhatsApp...');
    const inbox = await this.createApiInbox(account.id, apiToken, 'WhatsApp', webhookUrl);
    console.log('Inbox criado:', inbox.id);

    // 7. Criar webhook para receber eventos
    console.log('Criando webhook para eventos...');
    try {
      // Eventos necessários para o Realtime funcionar corretamente
      const webhookEvents = [
        'message_created',
        'message_updated',
        'conversation_created',
        'conversation_status_changed',
        'conversation_updated'
      ];
      const webhook = await this.createWebhook(account.id, apiToken, webhookUrl, webhookEvents);
      console.log('Webhook criado com eventos:', webhookEvents.join(', '));
    } catch (webhookError) {
      // Não falha se o webhook não for criado, apenas loga o erro
      console.warn('Aviso: Não foi possível criar webhook automaticamente:', webhookError);
    }

    // 8. Criar label "humano" (para indicar atendimento humano)
    console.log('Criando label humano...');
    try {
      const label = await this.createLabel(account.id, apiToken, 'humano', '#E74C3C');
      console.log('Label humano criada:', label.id);
    } catch (labelError) {
      // Não falha se a label não for criada
      console.warn('Aviso: Não foi possível criar label humano:', labelError);
    }

    return {
      accountId: account.id,
      userId: user.id,
      inboxId: inbox.id,
      apiToken,
    };
  }

  /**
   * Exclui uma conta (account) do Chatwoot
   * Isso remove automaticamente todos os usuários, inboxes, conversas, etc.
   */
  async deleteAccount(accountId: number): Promise<void> {
    const url = `${this.baseUrl}/platform/api/v1/accounts/${accountId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': this.platformToken,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chatwoot Delete Account API Error: ${response.status} - ${errorText}`);
    }
  }

  /**
   * Verifica se as credenciais da plataforma estão configuradas
   */
  isConfigured(): boolean {
    return Boolean(this.baseUrl && this.platformToken);
  }
}

// Singleton para uso em toda aplicação
export const chatwootAdmin = new ChatwootAdminClient();
