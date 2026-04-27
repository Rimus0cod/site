import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { readFile } from "fs/promises";

interface BackupStatusPayload {
  timestamp: string;
  file?: string;
  sizeBytes?: number;
}

export interface BackupStatusSnapshot {
  status: "fresh" | "stale" | "unknown";
  lastSuccessAt: string | null;
  ageSeconds: number | null;
  file: string | null;
  sizeBytes: number | null;
}

@Injectable()
export class BackupStatusService {
  constructor(private readonly configService: ConfigService) {}

  async getStatus(): Promise<BackupStatusSnapshot> {
    const statusFile = this.configService.get<string>(
      "backup.statusFile",
      "/var/lib/barberbook/backup-state/last-success.json",
    );
    const maxAgeHours = this.configService.get<number>("backup.maxAgeHours", 24);

    try {
      const content = await readFile(statusFile, "utf8");
      const payload = JSON.parse(content) as BackupStatusPayload;
      const timestamp = new Date(payload.timestamp);

      if (Number.isNaN(timestamp.getTime())) {
        return this.buildUnknown();
      }

      const ageSeconds = Math.max(0, Math.floor((Date.now() - timestamp.getTime()) / 1000));
      const isFresh = ageSeconds <= maxAgeHours * 60 * 60;

      return {
        status: isFresh ? "fresh" : "stale",
        lastSuccessAt: timestamp.toISOString(),
        ageSeconds,
        file: payload.file ?? null,
        sizeBytes: typeof payload.sizeBytes === "number" ? payload.sizeBytes : null,
      };
    } catch {
      return this.buildUnknown();
    }
  }

  private buildUnknown(): BackupStatusSnapshot {
    return {
      status: "unknown",
      lastSuccessAt: null,
      ageSeconds: null,
      file: null,
      sizeBytes: null,
    };
  }
}
