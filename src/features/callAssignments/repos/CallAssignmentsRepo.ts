import Environment from 'core/env/Environment';
import IApiClient from 'core/api/client/IApiClient';
import shouldLoad from 'core/caching/shouldLoad';
import { Store } from 'core/store';
import { CallAssignmentData, CallAssignmentStats } from '../apiTypes';
import {
  callAssignmentLoad,
  callAssignmentLoaded,
  statsLoad,
  statsLoaded,
} from '../store';
import { IFuture, PromiseFuture, RemoteItemFuture } from 'core/caching/futures';

export default class CallAssignmentsRepo {
  private _apiClient: IApiClient;
  private _store: Store;

  constructor(env: Environment) {
    this._apiClient = env.apiClient;
    this._store = env.store;
  }

  getCallAssignment(orgId: number, id: number): IFuture<CallAssignmentData> {
    const state = this._store.getState();
    const caItem = state.callAssignments.assignmentList.items.find(
      (item) => item.id == id
    );

    if (!caItem || shouldLoad(caItem)) {
      this._store.dispatch(callAssignmentLoad(id));
      const promise = this._apiClient
        .get<CallAssignmentData>(`/api/orgs/${orgId}/call_assignments/${id}`)
        .then((data: CallAssignmentData) => {
          this._store.dispatch(callAssignmentLoaded(data));
          return data;
        });

      return new PromiseFuture(promise);
    } else {
      return new RemoteItemFuture(caItem);
    }
  }

  getCallAssignmentStats(
    orgId: number,
    id: number
  ): IFuture<CallAssignmentStats> {
    const state = this._store.getState();
    const statsItem = state.callAssignments.statsById[id];

    if (shouldLoad(statsItem)) {
      this._store.dispatch(statsLoad(id));
      const promise = this._apiClient
        .get<CallAssignmentStats>(
          `/api/callAssignments/targets?org=${orgId}&assignment=${id}`
        )
        .then((data: CallAssignmentStats) => {
          this._store.dispatch(statsLoaded({ ...data, id: id }));
          return data;
        });

      return new PromiseFuture(promise);
    } else {
      return new RemoteItemFuture(statsItem);
    }
  }
}
