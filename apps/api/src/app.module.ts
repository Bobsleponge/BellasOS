import { type DynamicModule, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import type { Platform } from '@bellasos/runtime';
import { PLATFORM } from './platform.token';
import { AuthGuard } from './auth.guard';
import { BellasExceptionFilter } from './http';
import { CONTROLLERS, JarvisController, PLATFORM_CONTROLLERS } from './controllers';
import { IngestionController } from './ingestion.controller';
import { TodayController } from './today.controller';
import { GoalsController } from './goals.controller';
import { DecisionsController } from './decisions.controller';
import { WorldController } from './world.controller';
import { WorkspacesController } from './workspaces.controller';

@Module({})
export class AppModule {
  static forRoot(platform: Platform): DynamicModule {
    return {
      module: AppModule,
      controllers: [...CONTROLLERS, JarvisController, IngestionController, TodayController, GoalsController, DecisionsController, WorldController, WorkspacesController, ...PLATFORM_CONTROLLERS],
      providers: [
        { provide: PLATFORM, useValue: platform },
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_FILTER, useClass: BellasExceptionFilter },
      ],
    };
  }
}
