package endtoend

import fake.FakeEarthExplorer
import groovy.json.JsonOutput
import groovyx.net.http.HttpResponseDecorator
import groovyx.net.http.RESTClient
import org.openforis.sepal.instance.DataCenter
import org.openforis.sepal.instance.Instance
import org.openforis.sepal.instance.InstanceProvider
import org.openforis.sepal.scene.management.RequestScenesDownloadCommand
import org.openforis.sepal.transaction.SqlConnectionManager
import spock.util.concurrent.PollingConditions

class SepalDriver {
    final system = new Sepal().init()
    final RESTClient client = new RESTClient("http://localhost:$system.port/data/")

    final downloadWorkingDir = File.createTempDir('download', null)
    final homeDir = File.createTempDir('home', null)
    FakeEarthExplorer fakeEarthExplorer

    SepalDriver() {
        client.handler.failure = { response, body ->
            throw new FailedRequest(response, body)
        }
    }

    void resetDatabase() {
        system.resetDatabase()
    }

    SqlConnectionManager getSQLManager() {
        system.connectionManager
    }

    HttpResponseDecorator getDownloadRequests(String username) {
        getRequest("downloadRequests/$username")
    }

    HttpResponseDecorator getRequest(def path) {
        client.get(path: path) as HttpResponseDecorator
    }

    HttpResponseDecorator putRequest(def path, def body = null) {
        client.put(path: path, body: body) as HttpResponseDecorator
    }

    HttpResponseDecorator postRequest(def path, def body = null) {
        client.post(path: path, body: body) as HttpResponseDecorator
    }

    HttpResponseDecorator postDownloadRequests(Map downloadRequest) {
        client.post(
                path: "downloadRequests",
                body: new JsonOutput().toJson(downloadRequest),
                requestContentType: 'application/json'
        ) as HttpResponseDecorator
    }

    HttpResponseDecorator sendDeleteRequest(Integer requestId) {
        client.delete(
                path: "downloadRequests/$requestId",
                requestContentType: 'application/json'
        ) as HttpResponseDecorator
    }

    HttpResponseDecorator sendDeleteRequestScene(Integer requestId, Integer sceneId) {
        client.delete(
                path: "downloadRequests/$requestId/$sceneId",
                requestContentType: 'application/json'
        ) as HttpResponseDecorator
    }

    SepalDriver withUser(String username, int userUid) {
        system.database.addUser(username, userUid)
        return this
    }



    SepalDriver withUsers(String... usernames) {
        usernames.each {
            system.database.addUser(it)
        }
        return this
    }

    SepalDriver withRequests(RequestScenesDownloadCommand... requests) {
        requests.each {
            system.database.addDownloadRequest(it)
        }
        return this
    }

    SepalDriver withInstance (Instance instance) {
        instance.id = system.database.addInstance(instance)
        return this
    }

    SepalDriver withInstanceProvider(InstanceProvider provider){
        provider.id = system.database.addInstanceProvider(provider)
        return this
    }

    SepalDriver withInstanceProviders(InstanceProvider... providers){
        providers?.each{
            withInstanceProvider(it)
        }
        return this
    }

    SepalDriver withDataCenters(DataCenter... dataCenters){
        dataCenters?.each{
            withDataCenter(it)
        }
        return this
    }

    SepalDriver withDataCenter(DataCenter dataCenter){
        dataCenter.id = system.database.addDataCenter(dataCenter)
        return this
    }

    SepalDriver withCrawlingCriteria(int providerId, String field, String expectedValue) {
        system.database.addCrawlingCriteria(providerId, field, expectedValue)
        return this
    }

    SepalDriver withMetadataProvider(int id, String name, Boolean active = true) {
        system.database.addMetadataProvider(id, name, '', active)
        return this
    }

    SepalDriver withActiveDataSets(int ... dataSetIds) {
        dataSetIds.each {
            system.database.addActiveDataSet(it)
        }
        return this
    }

    SepalDriver withActiveDataSet(int dataSetId, int metadataProviderId) {
        system.database.addActiveDataSet(dataSetId, metadataProviderId)
        return this
    }

    void eventually(Closure callback) {
        new PollingConditions().eventually(callback)
    }

    void stop() {
        system.stop()
        fakeEarthExplorer?.stop()
    }
}

class FailedRequest extends RuntimeException {
    final HttpResponseDecorator response
    final body

    FailedRequest(HttpResponseDecorator response, body) {
        super(body as String)
        this.body = body
        this.response = response
    }
}
