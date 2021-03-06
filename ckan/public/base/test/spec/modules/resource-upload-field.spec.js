/*globals describe beforeEach afterEach it assert sinon ckan jQuery */
describe('ckan.modules.ResourceUploadFieldModule()', function () {
  var ResourceFileUploadModule = ckan.module.registry['resource-upload-field'];

  beforeEach(function () {
    jQuery.fn.fileupload = sinon.spy();

    this.el = jQuery('<form />');
    this.sandbox = ckan.sandbox();
    this.module = new ResourceFileUploadModule(this.el, {}, this.sandbox);
    this.module.initialize();
  });

  afterEach(function () {
    this.module.teardown();
  });

  describe('.initialize()', function () {
    beforeEach(function () {
      // Create un-initialised module.
      this.module.teardown();
      this.module = new ResourceFileUploadModule(this.el, {}, this.sandbox);
    });

    it('should create the #upload field', function () {
      this.module.initialize();
      assert.ok(typeof this.module.upload === 'object');
    });

    it('should append the upload field to the module element', function () {
      this.module.initialize();

      assert.ok(jQuery.contains(this.el[0], this.module.upload[0]));
    });

    it('should call .setupFileUpload()', function () {
      var target = sinon.stub(this.module, 'setupFileUpload');

      this.module.initialize();

      assert.called(target);
    });
  });

  describe('.setupFileUpload()', function () {
    it('should set the label text on the form input', function () {
      this.module.initialize();
      this.module.setupFileUpload();

      assert.equal(this.module.upload.find('label').text(), 'Upload a file');
    });

    it('should setup the file upload with relevant options', function () {
      this.module.initialize();
      this.module.setupFileUpload();

      assert.called(jQuery.fn.fileupload);
      assert.calledWith(jQuery.fn.fileupload, {
        type: 'POST',
        paramName: 'file',
        forceIframeTransport: true, // Required for XDomain request. 
        replaceFileInput: true,
        autoUpload: false,
        add:  this.module._onUploadAdd,
        send: this.module._onUploadSend,
        done: this.module._onUploadDone,
        fail: this.module._onUploadFail,
        always: this.module._onUploadComplete 
      });
    });
  });

  describe('.loading(show)', function () {
    it('should add a loading class to the upload element', function () {
      this.module.loading();

      assert.ok(this.module.upload.hasClass('loading'));
    });

    it('should remove the loading class if false is passed as an argument', function () {
      this.module.upload.addClass('loading');
      this.module.loading();

      assert.ok(!this.module.upload.hasClass('loading'));
    });
  });

  describe('.authenticate(key, data)', function () {
    beforeEach(function () {
      this.fakeThen = sinon.spy();
      this.fakeProxy = sinon.stub(jQuery, 'proxy').returns('onsuccess');

      this.target = sinon.stub(this.sandbox.client, 'getStorageAuth');
      this.target.returns({
        then: this.fakeThen
      });
    });

    afterEach(function () {
      jQuery.proxy.restore();
    });

    it('should request authentication for the upload', function () {
      this.module.authenticate('test', {});
      assert.called(this.target);
      assert.calledWith(this.target, 'test'); 
    });

    it('should register success and error callbacks', function () {
      this.module.authenticate('test', {});
      assert.called(this.fakeThen);
      assert.calledWith(this.fakeThen, 'onsuccess', this.module._onAuthError);
    });

    it('should save the key on the data object', function () {
      var data = {};

      this.module.authenticate('test', data);

      assert.equal(data.key, 'test');
    });
  });

  describe('.lookupMetadata(key, data)', function () {
    beforeEach(function () {
      this.fakeThen = sinon.spy();
      this.fakeProxy = sinon.stub(jQuery, 'proxy').returns('onsuccess');

      this.target = sinon.stub(this.sandbox.client, 'getStorageMetadata');
      this.target.returns({
        then: this.fakeThen
      });
    });

    afterEach(function () {
      jQuery.proxy.restore();
    });

    it('should request metadata for the upload key', function () {
      this.module.lookupMetadata('test', {});
      assert.called(this.target);
      assert.calledWith(this.target, 'test'); 
    });

    it('should register success and error callbacks', function () {
      this.module.lookupMetadata('test', {});
      assert.called(this.fakeThen);
      assert.calledWith(this.fakeThen, 'onsuccess', this.module._onMetadataError);
    });
  });

  describe('.notify(message, type)', function () {
    it('should call the sandbox.notify() method', function () {
      var target = sinon.stub(this.sandbox, 'notify');

      this.module.notify('this is an example message', 'info');

      assert.called(target);
      assert.calledWith(target, 'An Error Occurred', 'this is an example message', 'info');
    });
  });

  describe('.generateKey(file)', function () {
    it('should generate a unique filename prefixed with a timestamp', function () {
      var now   = new Date();
      var date  = jQuery.date.toISOString(now);
      var clock = sinon.useFakeTimers(now.getTime());
      var target = this.module.generateKey('this is my file.png');

      assert.equal(target, date + '/this-is-my-file.png');

      clock.restore();
    });
  });

  describe('._onUploadAdd(event, data)', function () {
    beforeEach(function () {
      this.target = sinon.stub(this.module, 'authenticate');
      sinon.stub(this.module, 'generateKey').returns('stubbed');
    });

    it('should authenticate the upload if a file is provided', function () {
      var data = {files: [{name: 'my_file.jpg'}]};
      this.module._onUploadAdd({}, data);

      assert.called(this.target);
      assert.calledWith(this.target, 'stubbed', data);
    });

    it('should not authenticate the upload if no file is provided', function () {
      var data = {files: []};
      this.module._onUploadAdd({}, data);

      assert.notCalled(this.target);
    });
  });

  describe('._onUploadSend()', function () {
    it('should display the loading spinner', function () {
      var target = sinon.stub(this.module, 'loading');
      this.module._onUploadSend({}, {});

      assert.called(target);
    });
  });

  describe('._onUploadDone()', function () {
    it('should request the metadata for the file', function () {
      var target = sinon.stub(this.module, 'lookupMetadata');
      this.module._onUploadDone({}, {result: {}});

      assert.called(target);
    });

    it('should call the fail handler if the "result" key in the data is undefined', function () {
      var target = sinon.stub(this.module, '_onUploadFail');
      this.module._onUploadDone({}, {result: undefined});

      assert.called(target);
    });

    it('should call the fail handler if the "result" object has an "error" key', function () {
      var target = sinon.stub(this.module, '_onUploadFail');
      this.module._onUploadDone({}, {result: {error: 'failed'}});

      assert.called(target);
    });
  });

  describe('._onUploadComplete()', function () {
    it('should hide the loading spinner', function () {
      var target = sinon.stub(this.module, 'loading');
      this.module._onUploadComplete({}, {});

      assert.called(target);
      assert.calledWith(target, false);
    });
  });

  describe('._onAuthSuccess()', function () {
    beforeEach(function () {
      this.target = {
        submit: sinon.spy()
      };

      this.response = {
        action: 'action',
        fields: [{name: 'name', value: 'value'}]
      };
    });

    it('should set the data url', function () {
      this.module._onAuthSuccess(this.target, this.response);

      assert.equal(this.target.url, this.response.action);
    });

    it('should set the additional form data', function () {
      this.module._onAuthSuccess(this.target, this.response);

      assert.deepEqual(this.target.formData, this.response.fields);
    });

    it('should merge the form data with the options', function () {
      this.module.options.form.params = [{name: 'option', value: 'option'}];
      this.module._onAuthSuccess(this.target, this.response);

      assert.deepEqual(this.target.formData, [{name: 'option', value: 'option'}, {name: 'name', value: 'value'}]);
    });

    it('should call data.submit()', function () {
      this.module._onAuthSuccess(this.target, this.response);
      assert.called(this.target.submit);
    });
  });

  describe('._onMetadataSuccess()', function () {
    it('should publish the "resource:uploaded" event', function () {
      var resource = {url: 'http://', name: 'My File'};
      var target = sinon.stub(this.sandbox, 'publish');

      sinon.stub(this.sandbox.client, 'convertStorageMetadataToResource').returns(resource);

      this.module._onMetadataSuccess();

      assert.called(target);
      assert.calledWith(target, "resource:uploaded", resource);
    });
  });
});
