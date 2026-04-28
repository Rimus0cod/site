import { Logger } from "@nestjs/common";

export interface TelegramMessage {
  chat: {
    id: number | string;
  };
  from?: {
    username?: string;
  };
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface TelegramResponse<T> {
  ok: boolean;
  description?: string;
  result: T;
}

export class TelegramApiClient {
  private readonly baseUrl: string;
  private nextUpdateId = 0;
  private pollingAbort: AbortController | null = null;
  private pollingTask: Promise<void> | null = null;

  constructor(
    token: string,
    private readonly logger: Logger,
  ) {
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  async sendMessage(chatId: string | number, text: string) {
    await this.request("sendMessage", {
      chat_id: chatId,
      text,
    });
  }

  startPolling(onMessage: (message: TelegramMessage) => Promise<void> | void) {
    if (this.pollingTask) {
      return;
    }

    this.pollingAbort = new AbortController();
    this.pollingTask = this.pollLoop(onMessage, this.pollingAbort.signal);
  }

  async stopPolling() {
    this.pollingAbort?.abort();
    await this.pollingTask?.catch(() => undefined);
    this.pollingAbort = null;
    this.pollingTask = null;
  }

  private async pollLoop(
    onMessage: (message: TelegramMessage) => Promise<void> | void,
    signal: AbortSignal,
  ) {
    await this.request("deleteWebhook", { drop_pending_updates: false }).catch(() => undefined);

    while (!signal.aborted) {
      try {
        const updates = await this.request<TelegramUpdate[]>(
          "getUpdates",
          {
            offset: this.nextUpdateId,
            timeout: 30,
            allowed_updates: ["message"],
          },
          signal,
        );

        for (const update of updates) {
          this.nextUpdateId = Math.max(this.nextUpdateId, update.update_id + 1);

          if (!update.message) {
            continue;
          }

          await onMessage(update.message);
        }
      } catch (error) {
        if (signal.aborted) {
          return;
        }

        const message = error instanceof Error ? error.message : "Unknown Telegram polling error";
        this.logger.warn(`Telegram polling request failed: ${message}`);
        await this.delay(5000, signal);
      }
    }
  }

  private async request<T>(
    method: string,
    body: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${method}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
    });

    let payload: TelegramResponse<T> | null = null;

    try {
      payload = (await response.json()) as TelegramResponse<T>;
    } catch {
      payload = null;
    }

    if (!response.ok || !payload?.ok) {
      const description = payload?.description ?? `HTTP ${response.status}`;
      throw new Error(description);
    }

    return payload.result;
  }

  private delay(ms: number, signal: AbortSignal) {
    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        cleanup();
        resolve();
      }, ms);

      const onAbort = () => {
        cleanup();
        resolve();
      };

      const cleanup = () => {
        clearTimeout(timeout);
        signal.removeEventListener("abort", onAbort);
      };

      signal.addEventListener("abort", onAbort, { once: true });
    });
  }
}
