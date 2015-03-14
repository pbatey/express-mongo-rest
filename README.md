# express-mongodb-rest
Node.js package to create an express middleware for a generic, mongodb-backed, RESTful API

```
var express = require('express')
var expressMongodbRest = require('express-mongodb-rest')
var app = express()
app.use('/api/v1', expressMongodbRest('mongodb://localhost:27017/mydb'))
var server = app.listen(3000, function () {
    console.log('Listening on Port', server.address().port)
})
```
The middleware is schema-agnostic, allowing any json document to be persisted and retrieved from mongo.

| Route            | Method | Notes                       |
| ---------------- | ------ | --------------------------- |
| /:collection     | GET    | Search the collection (uses [query-to-mongodb](https://www.npmjs.com/package/query-to-mongodb)) |
| /:collection     | POST   | Create a single document    |
| /:collection     | PUT    | Method Not Allowed          |
| /:collection     | PATCH  | Method Not Allowed          |
| /:collection     | DELETE | Remove all documents        |
| /:collection/:id | GET    | Retrieve a single document  |
| /:collection/:id | POST   | Method Not Allowed          |
| /:collection/:id | PUT    | Create or update a document |
| /:collection/:id | PATCH  | Update fields in a document (uses [jsonpatch-to-mongodb](https://www.npmjs.com/package/jsonpatch-to-mongodb))) |
| /:collection/:id | DELETE | Remove a single document    |

## Install
```
$ npm install express-mongodb-rest
```

## API
### expressMongoDbRest(db, options)
Create an express middleware that implements a RESTful API.

#### options:
* **envelope** Return responses wrapped in a type envelope. This can be overriden per request by specifying an _envelope_ query parameter.
* **singularize** A function to change the collection name into it's singlur form (ie., 'users' becomes 'user'). Used when returning a envelope for a single instance. Default is [inflection.singularize](https://www.npmjs.com/package/inflection).

## Use
I wanted to make it extremely simple to start a schema-agnostic https server, so `npm start` script starts one.

You can configure the following options in the .env file (uses [dotenv](https://www.npmjs.com/package/dotenv)):
* **PORT** The port to listen on. Default is 3000.
* **PFX** Certificate, Private key and CA certficiates to use for SSL. Default is none.
* **KEY** Private key to use for SSL. Default is none.
* **CERT** Certificate, to use for SSL. Default is none.
If neither of PFX or a KEY/CERT pair are specified, a self-sigend certificate and key is generated.

### GET /:collection
Search the collection.

### POST /:collection
Create a single document.

### DELETE /:collection
Remove all documents within the collection.

### GET /:collection/:id
Retrieve a single document.

### PUT /:collection/:id
Create or update a single document.

### PATCH /:collection/:id
Update fields in a document.

### DELETE /:collection/:id
Remove a single document.

### Returning result envelopes

### Best Practices
The server script was strongly influenced by [these]{http://www.vinaysahni.com/best-practices-for-a-pragmatic-restful-api} [articles](http://blog.mwaysolutions.com/2014/06/05/10-best-practices-for-better-restful-api/) about best practices for RESTful APIs.

Here's the list of recommendations from those articles. Items not yet supported are ~~struck-through~~:
1.  Use nouns but no verbs
2.  GET method and query parameters should not alter the state
3.  Use SSL everywhere
4.  ~~Have great documentation~~
5.  Use plural nouns
6.  ~~Use sub-resources for relations~~
7.  ~~Provide a way to autoload related resource representations~~
8.  Use HTTP headers for serialization formats
9.  ~~Use HATEOAS~~
10. Provider filtering, sorting, field selection and paging for collections
    * Filtering
    * Sorting
    * Field selection
    * Paging
11. Version your API
12. Return something useful from POST, PATCH, & PUT requests
13. Handle Errors with HTTP status codes
    * Use HTTP status codes
    * ~~Use error payloads~~
14. Allow overriding HTTP method
15. Use JSON where possible, ~~XML only if you have to~~ _No application/xml support_
16. Pretty print by default & ensure gzip is supported
17. Don't use response envelopes by default
18. Consider using JSON for POST, PUT and PATCH request bodies _No application/x-www-form-urlencoded or multipart/form-data support_
19. ~~Provide useful response headers for rate limiting~~
20. ~~Use token based authentication, transported over OAuth2 where delegation is needed~~
21. ~~Include response headers that facilitate caching~~

## Todo
* Address more best-practices in 'server.js'
    * Add schama validation (swagger-spec? json-schema?)
    * Add swagger.io for api documentation.
    * Add user authentication and authorization to API access (node-oauth2-server?)
    * Add rate limiting (express-limiter?)
    * Add OAuth2 (node-oauth2-server?)
