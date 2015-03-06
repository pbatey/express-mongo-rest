var express = require('express')
var mongoskin = require('mongoskin')
var ObjectID = require('mongodb').ObjectID
var patch2m = require('jsonpatch-to-mongodb')
var query2m = require('query-to-mongodb')
var bodyParser = require('body-parser')

module.exports = {
    Router: function (db, validator) {
        var router = express.Router()
        router.use(bodyParser.json())
        if (validator) router.use(validator)
        useDb(router, db)
        addRestMethods(router)
        return router
    }
}

function isEmpty(obj) {
    if (obj == null || obj.length === 0) return true
    if (obj.length > 0) return false
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) return false
    }
    return true
}

function fullUrl(req) {
    return req.protocol + '://' + req.get('host') + req.originalUrl
}

function useDb(router, db) {
    if (typeof(db) === 'string') db = mongoskin.db(db)
    router.db = db;
    router.use(function (req, res, next) {
        req.db = db
        next()
    })
    return router
}

function normalizeId(id) {
    if (ObjectID.isValid(id)) return new ObjectID(id)
    return id;
}

function addRestMethods(router) {
    router.param('collection', function collectionParam(req, res, next, collection) {
        req.collection = req.db.collection(collection)
        next()
    })

    router.param('id', function (req, res, next, id) {
        req.idMatch = { _id: normalizeId(id) }
        next()
    })

    router.get('/:collection', function (req, res, next) {
        var query = query2m(req.query)

        req.collection.count(query.criteria, function (e, count) {
            var links
            if (e) return next(e)
            res.append('X-Total-Count', count)
            links = query.links(fullUrl(req), count)
            if (links) res.links(links)
            req.collection.find(query.criteria, query.options).toArray(function (e, results) {
                if (e) return next(e)
                results.forEach(convertId)
                res.send(results)
            })
        })
    })

    router.post('/:collection', function (req, res, next) {
        if (!req.body || isEmpty(req.body)) throw { status: 400, message: 'No Request Body' } // Bad Request
        req.collection.insert(req.body, function (e, result) {
            if (e) return next(e)
            res.append('Location', fullUrl(req) + '/' + result[0]._id)
            res.status(201).send(convertId(result[0])); // Created
        })
    })

    router.put('/:collection', function (req, res, next) {
        // TODO: bulk update?
        res.status(405).send(); // Method Not Allowed
    })

    router.patch('/:collection', function (req, res, next) {
        res.status(405).send(); // Method Not Allowed
    })

    router.delete('/:collection', function (req, res, next) {
        req.collection.remove({}, null, function (e, result) {
            if (e) return next(e)
            res.status(204).send(); // No Content
        })
    })

    router.get('/:collection/:id', function (req, res, next) {
        req.collection.findOne(req.idMatch, function (e, result) {
            if (e) return next(e)
            if (!result) res.status(404); // Not Found
            res.send(convertId(result))
        })
    })

    router.post('/:collection/:id', function (req, res, next) {
        res.status(405).send(); // Method Not Allowed
    })

    router.put('/:collection/:id', function (req, res, next) {
        if (!req.body || isEmpty(req.body)) throw { status: 400, message: 'No Request Body' } // Bad Request
        req.body._id = normalizeId(req.params.id)
        req.collection.update(req.idMatch, req.body, { upsert: true }, function (e, result) {
            if (e) return next(e)
            // mongodb's update with $set/$unset doesn't error if there's no match
            // and doesn't return a result upon success; but a findOne after will
            req.collection.findOne(req.idMatch, function (e, result) {
                if (e) return next(e)
                res.send(convertId(result))
            })
        })
    })

    router.patch('/:collection/:id', function (req, res, next) {
        if (!req.body || isEmpty(req.body)) throw { status: 400, message: 'No Request Body' } // Bad Request
        req.collection.update(req.idMatch, patch2m(req.body), function (e, result) {
            if (e) return next(e)
            // mongodb's update with $set/$unset doesn't error if there's no match
            // and doesn't return a result upon success; but a findOne after will
            req.collection.findOne(req.idMatch, function (e, result) {
                if (e) return next(e)
                res.send(convertId(result))
            })
        })
    })

    router.delete('/:collection/:id', function (req, res, next) {
        req.collection.remove(req.idMatch, { single: true }, function (e, result) {
            if (e) return next(e)
            res.status(204).send(); // No Content
        })
    })

    // TODO: sub-resources (ie., get/post on /:collection/:id/resource)

    return router
}

function convertId(obj) {
    if (obj) {
        obj.id = obj._id
        delete obj._id
    }
    return obj
}
