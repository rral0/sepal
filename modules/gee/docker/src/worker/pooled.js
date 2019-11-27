const {Subject} = require('rxjs')
const {groupBy, mergeMap, map, share, filter, finalize, takeUntil} = require('rxjs/operators')
const {v4: uuid} = require('uuid')
const _ = require('lodash')
const log = require('@sepal/log')
const {initWorker$} = require('./factory')
const Pool = require('./pool')

const PooledWorker = ({concurrency, maxIdleMilliseconds, minIdleCount}) => {
    const workerRequest$ = new Subject()
    const workerResponse$ = new Subject()
    const cancel$ = new Subject()

    const workerPool = Pool({
        create$: ({jobId, jobPath}) => initWorker$(jobId, jobPath),
        onCold: ({jobId}) => log.debug(`Creating worker <${jobId}>`),
        onHot: ({jobId}) => log.debug(`Recycling worker <${jobId}>`),
        onRelease: ({jobId}) => log.trace(`Released worker <${jobId}>`),
        onDispose: ({jobId, item}) => {
            item.dispose()
            log.debug(`Disposed worker <${jobId}>`)
        },
        maxIdleMilliseconds,
        minIdleCount
    })
    
    const getWorkerInstance$ = (jobName, jobPath) =>
        workerPool.get$({slot: jobName, createArgs: {jobName, jobPath}}).pipe(
            map(({item: worker, release}) => ({worker, release}))
        )
    
    const submitRequest = ({requestId, jobName, jobPath, args, args$}) =>
        workerRequest$.next({requestId, jobName, jobPath, args, args$})
    
    const getResponse$ = requestId =>
        workerResponse$.pipe(
            share(),
            filter(({requestId: currentRequestId}) => currentRequestId === requestId),
            map(({result}) => result)
        )
    
    workerRequest$.pipe(
        groupBy(({jobName}) => jobName),
        mergeMap(group =>
            group.pipe(
                mergeMap(({requestId, jobName, jobPath, args, args$}) =>
                    getWorkerInstance$(jobName, jobPath).pipe(
                        mergeMap(({worker, release}) =>
                            worker.submit$(args, args$).pipe(
                                map(result => ({
                                    requestId,
                                    result
                                })),
                                takeUntil(cancel$.pipe(
                                    filter(({requestId: currentRequestId}) => currentRequestId === requestId),
                                )),
                                finalize(() => release())
                            )
                        )
                    ), null, concurrency
                ),
            )
        )
    ).subscribe(
        response => workerResponse$.next(response)
    )

    return {
        submit$(jobName, jobPath, args, args$) {
            log.trace(`Submitting <${jobName}> to pooled worker`)
            const requestId = uuid()
            submitRequest({requestId, jobName, jobPath, args, args$})
            return getResponse$(requestId).pipe(
                finalize(() => cancel$.next({requestId}))
            )
        }
    }
}

module.exports = PooledWorker
