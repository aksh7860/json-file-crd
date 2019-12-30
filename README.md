# JSON file store

A simple JSON file store for node.js.

## Install
    After taking the clone of repo install npm modules by npm install 

## Usage

```javascript
const FileStore = require('./FileStore');
const db = new FileStore("data");

var d = {
  foo: "bar"
};

// save with key as keyId 
db.save("keyId", d, function(err){
});

// save synchronously
const id = db.saveSync("keyId", d);

db.get("keyId", function(err, obj){
  // obj = { foo: "bar" }
})

// get synchronously
const obj = db.getSync("keyId");

// delete by ID
db.delete("keyId", function(err){
});

// delete synchronously
db.deleteSync("keyId");

```

### Optional TTL(Give Key an Expiry Time)

You can set a ttl for each key

```javascript
const FileStore = require('./FileStore');
const db = new FileStore("data");
// save with key as keyId and ttl(seconds)
db.save("keyId", d, 10, function(err){
});


```


## Tests

    npm test