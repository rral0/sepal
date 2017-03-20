package org.openforis.sepal.component.sandboxwebproxy

import groovy.json.JsonParserType
import groovy.json.JsonSlurper
import io.undertow.server.HttpServerExchange
import io.undertow.server.session.Session
import io.undertow.server.session.SessionConfig
import io.undertow.server.session.SessionManager
import org.openforis.sepal.component.sandboxwebproxy.api.SandboxSession
import org.openforis.sepal.component.sandboxwebproxy.api.SandboxSessionManager
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import java.util.concurrent.ConcurrentHashMap

class EndpointProvider {
    private final static Logger LOG = LoggerFactory.getLogger(this)
    private static final String USER_HEADER_KEY = "sepal-user"
    static final String USERNAME_KEY = "username"
    static final String SANDBOX_SESSION_ID_KEY = "sandbox-session-id"
    private final SessionManager httpSessionManager
    private final SandboxSessionManager sandboxSessionManager
    private final Map<String, Integer> portByEndpointName

    private final endpointByNameByUsername =
            new ConcurrentHashMap<String, ConcurrentHashMap<String, Endpoint>>()
    private final endpointsBySandboxHost = new ConcurrentHashMap<String, Set<Endpoint>>()

    EndpointProvider(
            SessionManager httpSessionManager,
            SandboxSessionManager sandboxSessionManager,
            Map<String, Integer> portByEndpointName) {
        this.httpSessionManager = httpSessionManager
        this.sandboxSessionManager = sandboxSessionManager
        this.portByEndpointName = portByEndpointName

        sandboxSessionManager.onSessionClosed { sandboxSessionClosed(it) }
    }

    Runnable heartbeatSender() {
        return {
            try {
                LOG.trace("Sending heartbeats for sandbox sessions referenced in http sessions")
                def activeHttpSessionIds = httpSessionManager.allSessions.toSet()
                activeHttpSessionIds.each { String httpSessionId ->
                    def httpSession = httpSessionManager.getSession(httpSessionId)
                    if (httpSession != null)
                        sendWorkerSessionHeartbeat(httpSession.getAttribute(USERNAME_KEY) as String)
                }
            } catch (Exception e) {
                LOG.error("Failed to send heartbeats", e)
            }
        } as Runnable
    }

    void sandboxSessionClosed(String sandboxHost) { // TODO: Check if it's properly invoked
        endpointsBySandboxHost.remove(sandboxHost).each { endpoint ->
            endpoint.close()
            endpointByNameByUsername.get(endpoint.username)?.remove(endpoint.name)
        }
    }

    private addEndpoint(SandboxSession sandboxSession, String endpointName, String username) {
        def endpointUri = URI.create("http://${sandboxSession.host}:${portByEndpointName[endpointName]}")
        def endpoints = endpointsBySandboxHost.computeIfAbsent(endpointUri.host) {
            ConcurrentHashMap.newKeySet()
        }
        def endpoint = new Endpoint(endpointName, username, endpointUri, sandboxSession.id)
        endpoints.add(endpoint)
        endpointByNameByUsername[username][endpointName] = endpoint
    }

    private removeEndpoint(Endpoint endpoint) {
        endpoint.close()
        endpointsBySandboxHost.get(endpoint.sandboxHost)?.remove(endpoint)
        endpointByNameByUsername.get(endpoint.username)?.remove(endpoint.name)
    }

    String startEndpoint(HttpServerExchange exchange) {
        def endpointName = exchange.queryParameters.endpoint?.peekFirst() as String
        if (!endpointName)
            throw new BadRequest('Missing query parameter: endpoint', 400)
        def username = username(exchange)
        def httpSession = getOrCreateHttpSession(exchange)

        def sandboxSession = findOrRequestSandboxSession(httpSession, username)
        httpSession.setAttribute(SANDBOX_SESSION_ID_KEY, sandboxSession.id)

        def endpointByName = endpointByNameByUsername.computeIfAbsent(username) {
            new ConcurrentHashMap<>()
        }

        def endpoint = endpointByName.get(endpointName)
        if (endpoint && endpoint.sandboxSessionId != sandboxSession.id) {
            // Endpoint doesn't match the expected sandbox
            removeEndpoint(endpoint)
            endpoint = null
        }

        if (!endpoint)
            addEndpoint(sandboxSession, endpointName, username)

        if (sandboxSession.isActive())
            return 'STARTED'
        else
            return 'STARTING'
    }

    Endpoint endpointFor(HttpServerExchange exchange) {
        def username = username(exchange)
        def endpointName = endpointName(exchange)
        def endpoint = endpointByNameByUsername.get(username)?.get(endpointName)
        if (!endpoint)
            throw new BadRequest("Endpoint must be started: ${endpointName}", 400)
        return endpoint
    }


    void sendWorkerSessionHeartbeat(String username) {
        endpointByNameByUsername[username]?.values()?.collect { endpoint ->
            endpoint.sandboxSessionId
        }?.flatten()?.toSet()?.each { sandboxSessionId ->
            try {
                LOG.debug("Sending sandbox sesssion heartbeat. username: $username, sandboxSessionId: $sandboxSessionId")
                sandboxSessionManager.heartbeat(sandboxSessionId as String, username)
            } catch (Exception e) {
                LOG.error("Failed to send sandbox sesssion heartbeat. username: $username, sandboxSessionId: $sandboxSessionId", e)
                endpointByNameByUsername[username].values()
                        .findAll { it.sandboxSessionId == sandboxSessionId }
                        .each {
                    LOG.debug("Closed endpoint after failing to send heartbeat. endpoint: $it")
                    it.close()
                }
            }
        }
    }

    private SandboxSession findOrRequestSandboxSession(Session httpSession, String username) {
        def sandboxSessionId = httpSession.getAttribute(SANDBOX_SESSION_ID_KEY) as String
        def sandboxSession = null
        if (sandboxSessionId)
            sandboxSession = sandboxSessionManager.findSession(sandboxSessionId)
        if (!sandboxSession || sandboxSession.closed) {
            def sandboxSessions = sandboxSessionManager.findPendingOrActiveSessions(username)
            // Take first active, or pending if none available
            if (sandboxSessions)
                sandboxSession = sandboxSessions.sort { it.active }.reverse().first()
            else
                sandboxSession = null // Don't use a closed sandbox session
        }
        if (sandboxSession && sandboxSession.username == username)
            sandboxSessionManager.heartbeat(sandboxSession.id, username)
        else
            sandboxSession = sandboxSessionManager.requestSession(username)
        return sandboxSession
    }

    private String endpointName(HttpServerExchange exchange) {
        def endpointName = exchange.requestURI.find('/([^/]+)') { match, group -> group }
        if (!endpointName)
            throw new BadRequest('Endpoint must be specified: ' + exchange.requestURL, 404)
        if (!portByEndpointName.containsKey(endpointName))
            throw new BadRequest("Non-existing sepal-endpoint: ${endpointName}", 404)
        return endpointName
    }

    private String username(HttpServerExchange exchange) {
        def httpSession = getOrCreateHttpSession(exchange)
        def username = httpSession.getAttribute(USERNAME_KEY)
        if (!username) {
            def user = exchange.requestHeaders.getFirst(USER_HEADER_KEY)
            if (!user)
                throw new BadRequest("Missing header: $USER_HEADER_KEY", 400)
            try {
                username = new JsonSlurper(type: JsonParserType.LAX).parseText(user).username
            } catch (Exception ignore) {
            }
            if (!username)
                throw new BadRequest("Malformed header: $USER_HEADER_KEY", 400)
            httpSession.setAttribute(USERNAME_KEY, username)
        }
        return username
    }

    private Session getOrCreateHttpSession(HttpServerExchange exchange) {
        SessionManager httpSessionManager = exchange.getAttachment(SessionManager.ATTACHMENT_KEY)
        SessionConfig sessionConfig = exchange.getAttachment(SessionConfig.ATTACHMENT_KEY)
        def session = httpSessionManager.getSession(exchange, sessionConfig)
        if (!session)
            session = httpSessionManager.createSession(exchange, sessionConfig)
        return session
    }

}