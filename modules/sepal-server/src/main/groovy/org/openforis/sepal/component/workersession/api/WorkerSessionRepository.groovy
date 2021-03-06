package org.openforis.sepal.component.workersession.api

interface WorkerSessionRepository {
    void insert(WorkerSession session)

    void update(WorkerSession session)

    WorkerSession getSession(String sessionId)

    List<WorkerSession> userSessions(String username, List<WorkerSession.State> states)

    List<WorkerSession> userSessions(String username, List<WorkerSession.State> states, String workerType)

    List<WorkerSession> userSessions(String username, List<WorkerSession.State> states, String workerType, String instanceType)

    List<WorkerSession> sessions(List<WorkerSession.State> states)

    WorkerSession sessionOnInstance(String instanceId, List<WorkerSession.State> states)

    List<WorkerSession> timedOutSessions()

}
