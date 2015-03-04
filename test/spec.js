var assert = require('chai').assert
var expressMongoRest = require('../index')
var express = require('express')
var mongoskin = require('mongoskin')
var ObjectID = require('mongodb').ObjectID
var http = require('http')
var request = require('supertest')
var logger = require('morgan')

function createApp(db) {
    var app = express()
    var router = expressMongoRest.Router(db)
    app.use('/api/v1', router)

    app.use(logger('dev'))

    app.use(function(err, req, res, next) {
        if (!err.status) console.error(err)
        res.status(err.status || 500)
        res.setHeader('Content-Type', 'application/json')
        res.send(err)
    })
    return app
}

describe('express-rest-mongo', function () {
    var app, db

    db = mongoskin.db('mongodb://localhost:27017/express-rest-mongo-test')
    db.bind('user')
    app = createApp(db)


    after(function (done) {
        db.dropDatabase()
        db.close(done)
    })

    describe('/:collection', function () {
        beforeEach(function (done) {
            db.user.remove({}, null, function () {
                var list = [{_id:'0001', name:'Bob', email:'bob@example.com'}, {name:'Judy', email:'judy@example.com'}]
                db.user.insert(list, null, done)
            })
        })

        describe('GET', function () {
            it('should find all', function (done) {
                request(app).get('/api/v1/user')
                    .expect(200)
                    .end(function(err, res) {
                        var results = JSON.parse(res.text)
                        if (err) throw err
                        assert.equal(results.length, 2)
                        assert.equal(res.headers['x-total-count'], 2)
                        done()
                    })
            })
            it('should find by query', function (done) {
                request(app).get('/api/v1/user?name=Bob')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) throw err
                        var results = JSON.parse(res.text)
                        assert.equal(results.length, 1)
                        assert.equal(res.headers['x-total-count'], 1)
                        assert.equal(results[0].name, 'Bob')
                        done()
                    })
            })
            it('should find none by query', function (done) {
                request(app).get('/api/v1/user?name=None')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) throw err
                        var results = JSON.parse(res.text)
                        assert.equal(results.length, 0)
                        assert.equal(res.headers['x-total-count'], 0)
                        done()
                    })
            })
        })

        describe('POST', function () {
            it('should create resource', function (done) {
                request(app).post('/api/v1/user')
                    .set('Content-Type', 'application/json')
                    .send({name:'Carl', email:'carl@example.com'})
                    .expect(201)
                    .end(function(err, res) {
                        var result = JSON.parse(res.text)
                        if (err) throw err
                        assert.ok(result._id)
                        done()
                    })
            })
            it('should fail w/o body', function (done) {
                request(app).post('/api/v1/user')
                    .set('Content-Type', 'application/json')
                    .expect(400)
                    .send()
                    .end(function(err, res) {
                        if (err) throw err
                        done()
                    })
            })
        })

        describe('PUT', function () {
            it('should fail w/o full path', function (done) {
                request(app).put('/api/v1/user')
                    .set('Content-Type', 'application/json')
                    .send({name:'Carl', email:'carl@example.com'})
                    .expect(405)
                    .end(function(err, res) {
                        if (err) throw err
                        done()
                    })
            })
        })

        describe('PATCH', function () {
            it('should fail w/o full path', function (done) {
                request(app).patch('/api/v1/user')
                    .set('Content-Type', 'application/json')
                    .send([
                        { op: "replace", path:'/name', value:'Bobby' },
                        { op: "replace", path:'/email', value:'bobby@example.com' }
                    ])
                    .expect(405)
                    .end(function(err, res) {
                        if (err) throw err
                        done()
                    })
            })
        })

        describe('DELETE', function () {
            it('should remove all', function (done) {
                db.user.count({}, function (e, result) {
                    assert.notEqual(result, 0, 'expect some to exist');
                    request(app).delete('/api/v1/user')
                        .set('Content-Type', 'application/json')
                        .expect(204)
                        .end(function(err, res) {
                            if (err) throw err
                            db.user.count({}, function (e, result) {
                                assert.equal(result, 0);
                                done()
                            })
                        })
                })
            })
        })
    })

    describe('/:collection/:id', function () {
        beforeEach(function (done) {
            db.user.remove({}, null, function () {
                var list = [{_id:'0001', name:'Bob', email:'bob@example.com'}, {name:'Judy', email:'judy@example.com'}]
                db.user.insert(list, null, done)
            })
        })

        describe('GET', function () {
            it('should find one', function (done) {
                request(app).get('/api/v1/user/0001')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) throw err
                        var results = JSON.parse(res.text)
                        assert.equal(results.name, 'Bob')
                        done()
                    })
            })
            it('should find one by generated id', function (done) {
                db.user.findOne({name:'Judy'}, function (e, result) {
                    var id = result._id
                    request(app).get('/api/v1/user/' + id)
                        .expect(200)
                        .end(function(err, res) {
                            if (err) throw err
                            var results = JSON.parse(res.text)
                            assert.equal(results.name, 'Judy')
                            done()
                        })
                })
            })
            it('should find none by id', function (done) {
                request(app).get('/api/v1/user/none')
                    .expect(404)
                    .end(function(err, res) {
                        if (err) throw err
                        done()
                    })
            })
        })

        describe('POST', function () {
            it('should fail w/ full path', function (done) {
                request(app).post('/api/v1/user/0001')
                    .set('Content-Type', 'application/json')
                    .expect(405)
                    .send()
                    .end(function(err, res) {
                        if (err) throw err
                        done()
                    })
            })
        })

        describe('PUT', function () {
            it('should update resource', function (done) {
                request(app).put('/api/v1/user/0001')
                    .set('Content-Type', 'application/json')
                    .send({name:'Bobby', email:'bobby@example.com'})
                    .expect(200)
                    .end(function(err, res) {
                        var result = JSON.parse(res.text)
                        if (err) throw err
                        assert.equal(result._id, '0001')
                        db.user.findOne({_id: '0001'}, function (e, result) {
                            assert.equal(result.name, 'Bobby');
                            done()
                        })
                    })
            })
            it('should update resource by generated id', function (done) {
                db.user.findOne({name:'Judy'}, function (e, result) {
                    var id = result._id
                    request(app).put('/api/v1/user/' + id)
                        .set('Content-Type', 'application/json')
                        .send({name:'Judith', email:'judith@example.com'})
                        .expect(200)
                        .end(function(err, res) {
                            var result = JSON.parse(res.text)
                            if (err) throw err
                            assert.equal(result._id, id)
                            db.user.findOne({_id: id}, function (e, result) {
                                assert.equal(result.name, 'Judith');
                                done()
                            })
                        })
                })
            })
            it('should create resource', function (done) {
                request(app).put('/api/v1/user/0002')
                    .set('Content-Type', 'application/json')
                    .send({name:'Carl', email:'carl@example.com'})
                    .expect(200)
                    .end(function(err, res) {
                        var result = JSON.parse(res.text)
                        if (err) throw err
                        assert.equal(result._id, '0002')
                        db.user.findOne({_id: '0002'}, function (e, result) {
                            assert.equal(result.name, 'Carl');
                            done()
                        })
                    })
            })
            it('should fail w/o body', function (done) {
                request(app).put('/api/v1/user/0')
                    .set('Content-Type', 'application/json')
                    .expect(400)
                    .send()
                    .end(function(err, res) {
                        if (err) throw err
                        done()
                    })
            })
        })

        describe('PATCH', function () {
            it('should update resource', function (done) {
                request(app).patch('/api/v1/user/0001')
                    .set('Content-Type', 'application/json')
                    .send([
                        { op: "replace", path:'/name', value:'Bobby' },
                        { op: "replace", path:'/email', value:'bobby@example.com' }
                    ])
                    .expect(200)
                    .end(function(err, res) {
                        var result = JSON.parse(res.text)
                        if (err) throw err
                        assert.equal(result._id, '0001')
                        db.user.findOne({_id: '0001'}, function (e, result) {
                            assert.equal(result.name, 'Bobby');
                            done()
                        })
                    })
            })
        })

        describe('DELETE', function () {
            it('should remove resource', function (done) {
                db.user.count({name: 'Bob'}, function (e, result) {
                    assert.equal(result, 1, 'expect match to exist');

                    request(app).delete('/api/v1/user/0001')
                        .set('Content-Type', 'application/json')
                        .expect(204)
                        .end(function(err, res) {
                            if (err) throw err
                            db.user.count({name: 'Bob'}, function (e, result) {
                                assert.equal(result, 0);
                                done()
                            })
                        })
                })
            })

            it('should remove resource by generated id', function (done) {
                db.user.findOne({name:'Judy'}, function (e, result) {
                    var id = result._id
                    assert.ok(id, 'expect match to exist');
                    request(app).delete('/api/v1/user/' + id)
                        .expect(204)
                        .end(function(err, res) {
                            if (err) throw err
                            db.user.count({name: 'Judy'}, function (e, result) {
                                assert.equal(result, 0);
                                done()
                            })
                        })
                })
            })
        })
    })
})
