import Environment from 'core/env/Environment';
import IApiClient from 'core/api/client/IApiClient';
import { IFuture } from 'core/caching/futures';
import { Store } from 'core/store';
import { ZetkinTask } from '../components/types';
import getStats, { TaskStats } from '../rpc/getTaskStats';
import {
  loadItemIfNecessary,
  loadListIfNecessary,
} from 'core/caching/cacheUtils';
import {
  statsLoad,
  statsLoaded,
  taskLoad,
  taskLoaded,
  tasksLoad,
  tasksLoaded,
} from '../store';

export default class TasksRepo {
  private _apiClient: IApiClient;
  private _store: Store;

  constructor(env: Environment) {
    this._apiClient = env.apiClient;
    this._store = env.store;
  }

  getTask(orgId: number, taskId: number): IFuture<ZetkinTask> {
    const state = this._store.getState();
    const item = state.tasks.tasksList.items.find((item) => item.id === taskId);

    return loadItemIfNecessary(item, this._store, {
      actionOnLoad: () => taskLoad(taskId),
      actionOnSuccess: (data) => taskLoaded(data),
      loader: () =>
        this._apiClient.get<ZetkinTask>(`/api/orgs/${orgId}/tasks/${taskId}`),
    });
  }

  getTaskStats(orgId: number, taskId: number): IFuture<TaskStats> {
    const state = this._store.getState();
    const item = state.tasks.statsById[taskId];
    return loadItemIfNecessary(item, this._store, {
      actionOnLoad: () => statsLoad(taskId),
      actionOnSuccess: (data) => statsLoaded([taskId, data]),
      loader: () => this._apiClient.rpc(getStats, { orgId, taskId }),
    });
  }

  getTasks(orgId: number): IFuture<ZetkinTask[]> {
    const state = this._store.getState();
    const taskList = state.tasks.tasksList;

    return loadListIfNecessary(taskList, this._store, {
      actionOnLoad: () => tasksLoad(),
      actionOnSuccess: (data) => tasksLoaded(data),
      loader: () =>
        this._apiClient.get<ZetkinTask[]>(`/api/orgs/${orgId}/tasks/`),
    });
  }
}
