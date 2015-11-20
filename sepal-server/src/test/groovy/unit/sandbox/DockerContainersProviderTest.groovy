package unit.sandbox

import org.openforis.sepal.sandbox.DockerClient
import org.openforis.sepal.sandbox.DockerContainersProvider
import org.openforis.sepal.sandbox.SandboxData
import org.openforis.sepal.user.UserRepository
import spock.lang.Specification

class DockerContainersProviderTest extends Specification {
    static A_CONTAINER_ID = "A_CONTAINER_ID"
    static ANOTHER_CONTAINER_ID = "A_CONTAINER_ID2"

    def 'The release method behaves correctly both when asked to release running or terminated containers'() {
        given:
            def userRepository = Mock(UserRepository)

            def dockerClient = Stub(DockerClient) {
                isContainerRunning(_  as SandboxData) >>> [false,true]
                releaseContainer(_ as SandboxData) >> true
            }

            def dockerContainersProvider = new DockerContainersProvider(dockerClient, userRepository)
        when:
            def released = dockerContainersProvider.release(new SandboxData(containerId:  A_CONTAINER_ID))
            def released2 = dockerContainersProvider.release(new SandboxData(containerId:  ANOTHER_CONTAINER_ID))
        then:
            !released
            released2
    }
}
