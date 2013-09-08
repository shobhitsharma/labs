Tips, tricks & Hacks
--------------------

- Replicaset Tags used to configure getLastErrorModes
- separate MongoDB Clusters
    * different read/write requirements into different clusters
- use ``upsert`` and ``insert``, not ``save``
    * ``save`` is an insert or a complete rewrite
    * avoid ``update`` without atomic modifiers
    * update without modifiers like ``$set`` or ``$inc`` but with a whole new document will store this one, like couchDB
- putting unrelated replica-sets all behind a mongos/configsvr will make all DBs available to the application with one connection-specification (do not use with sharding)
- manage where next inserted documents will go in your sharded cluster by switching off the balancer and insert a new document into ``config.chunks``.
- ``findAndModify`` - can be used for having autoincrement-features:

```javascript
    db.counters.findAndModify(
        {
            query : {"name:"mycounter"},
            update : { $inc:{ c:1 } }
        }
    );
```


- poll the replication oplog for implementing asnyc triggers or whatever
    * oplog contains usual mongodb-records
    * feed a search-engine, update other indexes ...
    * tricky with sharding
- cut a shard in two (*hack*) by restarting some replSet-members with new ``replSet``-config and change the chunk-distribution

Indexes and Query-Optimization
------------------------------

* Tree-Structures
* Index-Order (inc, dec) is imported with compound-keys (e.g. newest entries by user)
* ``db.c.createIndex({field:1}, {unique:true, dropDups:true})``
* per default a blocking operation, not when ``background:true``, but still has serious impact
* ``db.collection.reIndex()`` - e.g. for defragmentation
* affects all operations: ``find``, ``distinct``, ``update``, ``remove``, ``sort``
* Array-Matching

* Compound Indexes

    * index ``{x:1, y:1}``
    * matches queries for ``x`` and ``y``, for ``x``, but not for ``y`` only.
    * every index can only contain one multi-value field in a given index, because there is an index-value for every array-value

* When Indexes aren't useful:

    * wildcard-query with ``$not``
    * ``$where``

* When Indexes help a little:

    * ``db.c.find({x:{$mod:[10,0]}})`` will limit scan to numbers
    * ...

* Geospatial indexes:

    * index: ``{x:"2d"}``
    * ``db.c.find({x:[50,50]})``
    * ``db.c.find({x:{$near:[50,50]}});`` ordered from closest to furthest
    * ``$within``:
        * $box : [[50,50],[100,100]]
        * $center : [[50,50],10]
        * $polygon : [[0,0],[10,10],[20,20]]
        * what does it mean to lie inside a polygon? ...

* Sparse Indexes:
    
    * only stores documents that have a value for the given key
    * currently key must be a single field
    * sort only returns documents in the index
    * {$exists: false} won't find documents
    * can be combinded with unique

* Covering Index

    * every fields in the query and all returned fields are in the index

* indexes slow down inserts and updates (if working portion of Index does not fit into RAM)
* @see: schema design at scale http://www.10gen.com/presentations/mongosf2011/schemascale
* max. 64 indexes per Collection

Query Optimizer
...............

* picks which index to use
* force an index to use: ``db.c.find({x:99,y:3}).hint({y:1})`` ignores ``{x:1}`` but uses ``{y:1}``
* ``hint($natural:1)`` - force a full collection-scan

Explain - Command
.................

* "indexOnly":true - used a covering index
* ...

Profiling
.........

``db.setProfilingLevel(level)``

    * 0: off
    * 1: slow
    * 2: all
* record performance infos go into ``db.system.profile``

Questions
.........

* **Sharding:** Unique Indexes have to start wit hthe sharding key
* **Indexing a Polyline/Polygon:** approximate them by their bounding-box, decompose non-convex polygons, ...


When and How to use Sharding
----------------------------

* if write throughput can't be handled by one replSet-master
* if working set doesn't fit into one replSets physical memory
* when mongod-process resident-RAM-size = physical RAM-Size and page-faults happen -> working-sets do not fit into memory
* more shards: more records that can be kept in memory
* mongoS - mongo Shard-Server - Routing Server
    * put a mongos on each of the application-servers
    * clients **must always** connect to the mongoS and see one database
    * Routes are defined and stores in ``configsrv``-instances

* ``configsrv`` **CRITICAL INFRASTRUCTURE**
    * **You always need three!!!**
    * writes will fail, if not all three get informations written
    * what shards exist
    * what databases exist
    * what collections are distributed to what shards
    * when one breaks, metadata/routes are read-only, nothing changes
    * even the balancer stops if any of the config-servers is down
* shard-key: 
    * can be compound
    * for every shard, there exists a document with with the shard-ranges for a collections
    * configsrvs do not know the ranges apriori but try to keep all chunks balanced by updating these ranges (all according to document size)
    * should provide:
        * write load distribution
        * fine-grained splitting (boolean values are no good, insert-timestamps are bad --> hotspot, )
        * always-increasing shard-keys are bad (auto-increment ids)
        * md5sums will give you write-distribution, but loses locality of data --> total random access, but random access puts more pressure on mongod
        * relationship to data access pattern
* switch Splitting off, means that chunks are no more equally deistributed
* Migration 
    * happens when a shard has too many chunks
    * manual migration: ``moveChunk``
    * migrations are invisible, documents are kept available on the ``donor`` while migrating
    * any shard can only take part in one migration at a time

Setup
.....

Everytime you want to add a shard:

.. code-block:: javascript

    db.adminCommand(
        { addShard : "replSetName:host1:port,..." }
    );

10 Key Performance Indicators
-----------------------------

* by default mongo will log every request > 100ms
* ``setProfileLevel(...)`` - logs everything to a 1 MB capped collection
* to investigate what a query does with a certain db, index-setup, etc.: ``<query>().explain()``
* **Replication Lag**
    * says how much replicas/secondaries lag behing the state of the master
    * find out with: ``rs.status()``
* **Do never run MongoDB on a 32-Bit System** - because of OS-Limitation of Memory Mapped Files (``man 2 mmap``) to 4 GB maximum
* **Resident Memory**
    * ``db.status()``
    * *indexSize* + *storageSize* should fit into memory 
* **Page-Faults**
    * high number of page-faults means more IO than real DB-work ("trashing")
    * find out with:
    * ``db.serverStatus().extra_info``

* **Write-Lock-Percentage**
    * ``db.serverStatus.globalLock``
    * simple: bad when to high, means paging

* **Database Architecture**
    * One DB-Writer-Thread that yields very often and does not lock the DB completely all the time
    * Many DB-Reader-Threads
    * with upcoming version 2.2: searate Locks per DB
    * Has got Reader and Writer Queues, enqueueing operations to come
    * ``db.currentOp()`` tells you what runs just now, can be used to kill DB-operations
    * Backround-Flushing (fsync) of mmapped files to disk can be tuned to be done more often (every 60 seconds by default) to have less data be written more often
    * 1 DB-Connection is handled by 1 Thread in the *mongod*-Process
    * Many Connections result in many context-switches
        * more small reads and writes are better handled with more connections
        * few heavy operations should be handled with less connections
        * **Always clean up your connections!**
* Mmapped Files and Pages etc.
    * when ``storageSize/size > 2`` somethin is wrong
    * run the ``compact``-command on your database