const fs        =    require('fs');
const path      =   require('path');
const chai      =   require('chai');
const FileStore =   require('../FileStore');
const { exec }  = require('child_process');

const should = chai.should();
const expect = chai.expect();
describe("File Based Json Store ", () => {
  
  const NAME =  "dataTest";

  it("resolves the path correctly", () => {
    const x1 = new FileStore("/tmp/foo/bar");
    x1._dir.should.equal('/tmp/foo');
  });

  describe("save method", () => {

    it("can save an object", (done) => {
      const store = new FileStore(NAME);
      const data = {
        x: 56
      };
      //done();
      store.save("id", data, 10, (err) => {
        should.not.exist(err);
        fs.readFile( NAME + ".json", "utf-8", (err, content) => {
          store.save("emptyObj", {}, 1, (err) => {
            should.not.exist(err);
            store.get("emptyObj", (err, o) => {
              should.not.exist(err);
              o.should.eql({});
              done();
            });
          });
        });
      });
    });
  });

  describe("get method", () => {

    it("can load an object", (done) => {
      const store = new FileStore(NAME);
      const data = {
        x: 90
      };
      store.save("newId", data, 1, (err) => {
        store.get("newId", (err, o) => {
          o.x.should.equal(90);
          done();
        });
      });
    });

    it("returns an error if it cannot load an object", (done) => {
      let store = new FileStore(NAME);
      store.get("foobarobject", (err, o) => {
        err.should.be.ok;
        err.message.should.equal("Key Not Found");
        done();
      });
    });
  });

  describe("delete method", () => {

    it("can delete an object", (done) => {
      const store = new FileStore(NAME);
      const data = {
        y: 88
      };
      store.save("data",data, 8, (err) => {
        fs.readFile(NAME+".json", "utf-8", (err, content) => {
          content.should.not.eql("");
          store.delete("data", (err) => {
            store.get("data", (err, o) => {
              err.should.be.ok;
              err.message.should.equal("Key Not Found");
              done();
            });
          });
        });
      });
    });

    it("returns an error if the record does not exist", (done) => {
      let store = new FileStore(NAME);
      store.delete("random", (err) => {
          err.should.be.ok;
          err.message.should.equal("Key Not Found");
          done();
      });
    });
  });
});
