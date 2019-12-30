const async = require('async');
const fs   =  require('fs');
const path =  require('path');
const uuid =  require('uuid');
const mkdirp = require('mkdirp');
const clone = require('clone');

const isJSONFile = f => f.substr(-5) === ".json";
const removeFileExtension = f => f.split(".json")[0];
const getIDs = a => a.filter(isJSONFile).map(removeFileExtension);
const readIDsSync = d => getIDs(fs.readdirSync(d));
const readIDs = (d, cb) => fs.readdir(d, (err, ids) => cb(err, getIDs(ids)));

const getObjectFromFileSync = function(id) {
  try {
    let obj = JSON.parse(fs.readFileSync(this._getFileName(), "utf8"));
    const currTimeInseconds = Math.floor(new Date().getTime() / 1000);
    if(typeof obj[id] == "undefined") {
      throw new Error("Key Not Found");
    }
    const ttlInSeconds = (obj[id].createdAt+obj[id].ttl);
    if(currTimeInseconds>ttlInSeconds) {
      throw new Error("Key Expired");
    }
    return obj[id].value;
  } catch (error) {
    return error;
  }
};

const getObjectFromFile = function(id, cb) {
  fs.readFile(this._getFileName(), "utf8", (err, o) => {
    if (err) {
      return cb(err);
    }
    try {
      let obj = JSON.parse(o);
      if(typeof obj[id] == "undefined") {
        throw new Error("Key Not Found");
      }
      const currTimeInseconds = Math.floor(new Date().getTime() / 1000);
      const ttlInSeconds = (obj[id].createdAt+obj[id].ttl);
      if(currTimeInseconds>ttlInSeconds) {
        throw new Error("Key Expired");
      } else {
        cb(null, obj[id].value);
      }
    } catch (error) {
      cb(error);
    }
  });
};

const FILE_EXISTS = fs.constants ? fs.constants.F_OK : fs.F_OK;
const FILE_IS_WRITABLE = fs.constants ? fs.constants.W_OK : fs.W_OK;

const canWriteToFile = (file, cb) => {
  fs.access(file, FILE_EXISTS, (err) => {
    if (err) return cb(null);
    fs.access(file, FILE_IS_WRITABLE, cb);
  });
};

const canWriteToFileSync = (file) => {
  try {
    fs.accessSync(file, FILE_EXISTS);
  } catch (err) {
    return;
  }

  fs.accessSync(file, FILE_IS_WRITABLE);
};

const saveObjectToFile = function(o, file, cb) {
  const indent = 2;
  let json;
  try {
    json = JSON.stringify(o, null, indent);
  } catch (error) {
    if (typeof cb === "function") {
      return cb(error);
    } else {
      return error;
    }
  }

  const tmpFileName = file + uuid.v4() + ".tmp";

  if (typeof cb === "function") {
    canWriteToFile(file, (err) => {
      if (err) return cb(err);

      fs.writeFile(tmpFileName, json, 'utf8', (err) => {
        if (err) return cb(err);

        fs.rename(tmpFileName, file, cb);
      });
    });
  } else {
    try {
      canWriteToFileSync(file);
      fs.writeFileSync(tmpFileName, json, 'utf8');
      fs.renameSync(tmpFileName, file);
    } catch (error) {
      return error;
    }
  }
};

const sizeLimitCheck = function(obj) {
  let bytes = 0;
  function sizeOf(obj) {
    if(obj !== null && obj !== undefined) {
      switch(typeof obj) {
      case 'number':
          bytes += 8;
          break;
      case 'string':
          bytes += obj.length * 2;
          break;
      case 'boolean':
          bytes += 4;
          break;
      case 'object':
          var objClass = Object.prototype.toString.call(obj).slice(8, -1);
          if(objClass === 'Object' || objClass === 'Array') {
              for(var key in obj) {
                  if(!obj.hasOwnProperty(key)) continue;
                  sizeOf(obj[key]);
              }
          } else bytes += obj.toString().length * 2;
          break;
      }
    }
    return bytes;
  }
  if(sizeOf(bytes)>16000) {
      return false; 
  }
  return true;
}

const save = function(id, ttl, o, cb) {
  let err, k, data;
  const file = this._getFileName();
  o = clone(o);
  const jsonString =  fs.readFileSync(this._getFileName(), "utf8");
  const seconds = Math.floor(new Date().getTime() / 1000);
  // Check the Key and Value Size
  if(id.length>32 || !sizeLimitCheck(o)) {
    const e = new Error("Either Key or Value Size Limit Breached");
    if(typeof cb == "function") {        
      return cb(e);
    }
    else {
      return e;
    }  
  }
  let obj = {};
  let tempObj={
    value: o,
    ttl: ttl,
    createdAt: seconds
  };
  // Validation of Json File 
  if(jsonString.toString()==""){
    obj[id] =  tempObj;
  } else {
    obj = JSON.parse(jsonString);
    if(id in obj) {
        const e = new Error("Key Already exists");
        if(typeof cb == "function") {        
          return cb(e);
        }
        else {
          return e;
        }
    } else {
      obj[id] = tempObj;
    }
  }
  data = obj;
  const done = function(err) {
    if (err) {
      if (typeof cb === "function") {
        cb(err);
      } else {
        return err;
      }
    } else {
      if (typeof cb === "function") {
        cb(null, id);
      } else {
        return id;
      }
    }
  };

  if (typeof cb === "function") {
    saveObjectToFile.call(this, data, file, done.bind(this));
  } else {
    return done.call(this, saveObjectToFile.call(this, data, file));
  }
};

const get = function(id, cb) {
  const done = function (err, o) {
    let e, item;
    if (err) {
      if (typeof cb === "function") {
        return cb(err);
      } else {
        return err;
      }
    }
    item = o;
    if (typeof cb === "function") {
      return cb(null, item);
    } else {
      return item;
    }
  };
  if (typeof cb === "function") return getObjectFromFile.call(this, id, done.bind(this));
  const err = (o = getObjectFromFileSync.call(this, id)) instanceof Error;
  return done.call(this, (err ? o : void 0), (!err ? o : void 0));
};

const remove = function(id, cb) {
  let e, o;
  const file = this._getFileName();
  const jsonString =  fs.readFileSync(file, "utf8");
  let obj={};
  if(jsonString.toString()==""){
    e = new Error("File is Empty");
    if(typeof cb == "function") {        
      return cb(e);
    }
    else {
      return e;
    }
  } else {
    obj = JSON.parse(jsonString);
    if(typeof obj[id] == "undefined") {
      e = new Error("Key Not Found");
      if(typeof cb == "function") {        
        return cb(e);
      }
      else {
        return e;
      } 
    }
    const currTimeInseconds = Math.floor(new Date().getTime() / 1000);
    const ttlInSeconds = (obj[id].createdAt+obj[id].ttl);
    if(currTimeInseconds>ttlInSeconds) {
      e = new Error("Key Expired,Unable To Delete");
      if(typeof cb == "function") {        
        return cb(e);
      }
      else {
        return e;
      } 
    }
    delete obj[id];
  }
  data = obj;
  const done = function (err) {
    if (err) {
      return (typeof cb === "function" ? cb(err) : err);
    }
    return typeof cb === "function" ? cb() : void 0;
  };

  if (typeof cb === "function") {
    return saveObjectToFile.call(this, data, file, done.bind(this));
  }

  const err = (o = saveObjectToFile.call(this, data, file)) instanceof Error;
  return done.call(this, (err ? o : void 0), (!err ? o : void 0));
};

class FileStore {

    constructor(name = 'store', opt = {}) {
  
        this.name = name;
        if (isJSONFile(this.name)) {
            this.name = this.name.split(".json")[0];
        }
        this._dir = path.resolve(this.name);
        this._dir = path.dirname(this._dir);
        mkdirp.sync(this._dir);  
        const fn = this._getFileName();
        if (!fs.existsSync(fn)) {
            if (fs.writeFileSync(fn, "{}", 'utf8')) {
                throw new Error("could not create file");
            }
        }
    }

  
    _getFileName() {
        return path.join(this._dir, (path.basename(this.name)) + ".json");
    }
  
    save(id, obj, ttl= -1, cb = () => {}) {
      return save.call(this, id, ttl, obj, cb);
    }
  
    saveSync(id, o, ttl=-1) {
      return save.call(this, id, ttl, o);
    }
  
    get(id, cb = () => {}) {
      get.call(this, id, cb);
    }
  
    getSync(id) {
      return get.call(this, id);
    }
  
    delete(id, cb) {
      remove.call(this, id, cb);
    }
  
    deleteSync(id) {
      return remove.call(this, id);
    }
  }
  
  module.exports = FileStore;
  