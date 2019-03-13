import { expect } from 'chai';

import { jsonapiModule } from '../../../src/jsonapi-vuex.js';
import {
  createJsonWidget1,
  createJsonWidget2,
  createNormWidget1,
  createNormWidget2,
} from '../fixtures/index';

describe("get", function() {

  let json_machine_1, norm_machine_1, json_widget_1, json_widget_2,
    norm_widget_1, norm_widget_2;

  beforeEach(function() {
    json_machine_1 = {
      id: '1',
      type: 'machine',
      attributes: {
        'foo': 1
      }
    }

    norm_machine_1 = {
      'foo': 1,
      '_jv': {
        'type': 'machine',
        'id': '1'
      }
    }

    json_widget_1 = createJsonWidget1();
    json_widget_2 = createJsonWidget2();
    norm_widget_1 = createNormWidget1();
    norm_widget_2 = createNormWidget2();
  });

  it("should make an api call to GET item(s)", async function() {
    this.mock_api.onAny().reply(200, { data: json_widget_1 })

    await this.jm.actions.get(this.stub_context, norm_widget_1)

    expect(this.mock_api.history.get[0].url).to.equal(`/${norm_widget_1['_jv']['type']}/${norm_widget_1['_jv']['id']}`)
  })

  it("should make an api call to GET a collection", async function() {
    this.mock_api.onAny().reply(200, { data: json_widget_1 })
    delete norm_widget_1['_jv']['id']

    await this.jm.actions.get(this.stub_context, norm_widget_1)

    expect(this.mock_api.history.get[0].url).to.equal(`/${norm_widget_1['_jv']['type']}`)
  })

  it("should accept axios config as the 2nd arg in a list", async function() {
    this.mock_api.onAny().reply(200, { data: json_widget_1 })
    const params = { filter: "color" }

    await this.jm.actions.get(this.stub_context, [ norm_widget_1, { params: params } ])

    expect(this.mock_api.history.get[0].params).to.equal(params)
  })

  it("should add record(s) in the store", async function() {
    this.mock_api.onAny().reply(200, { data: json_widget_1 })

    await this.jm.actions.get(this.stub_context, norm_widget_1)

    expect(this.stub_context.commit).to.have.been.calledWith("add_records", norm_widget_1)
  })

  it("should add record(s) (string) in the store", async function()  {
    this.mock_api.onAny().reply(200, { data: json_widget_1 })

    // Leading slash is incorrect syntax, but we should handle it so test with it in
    await this.jm.actions.get(this.stub_context, "widget/1")

    expect(this.stub_context.commit).to.have.been.calledWith("add_records", norm_widget_1)
  })

  it("should return normalized data", async function() {
    this.mock_api.onAny().reply(200, { data: json_widget_1 })

    let res = await this.jm.actions.get(this.stub_context, norm_widget_1)

    expect(res).to.deep.equal(norm_widget_1)
  })

  it("should add included record(s) to the store", async function() {
    // included array can include objects from different collections
    const data = {
      data: json_widget_1,
      included: [ json_widget_2, json_machine_1 ]
    }
    this.mock_api.onAny().reply(200, data)

    // for a real API call, would need axios include params here
    await this.jm.actions.get(this.stub_context, norm_widget_1)

    expect(this.stub_context.commit).to.have.been.calledWith("add_records", norm_widget_2)
    expect(this.stub_context.commit).to.have.been.calledWith("add_records", norm_machine_1)
  })

  it("should return normalized data with expanded rels (single item)", async function() {
    const jm = jsonapiModule(this.api, { 'follow_relationships_data': true })
    // Make state contain all records for rels to work
    this.stub_context['state'] = this.store_record
    this.mock_api.onAny().reply(200, { data: json_widget_1 })

    let res = await jm.actions.get(this.stub_context, norm_widget_1)

    expect(res).to.deep.equal(this.norm_widget_1_rels)
  })

  it("should return normalized data with expanded rels (array)", async function() {
    const jm = jsonapiModule(this.api, { 'follow_relationships_data': true })
    // Make state contain all records for rels to work
    this.stub_context['state'] = this.store_record
    this.mock_api.onAny().reply(200, this.json_record)

    let res = await jm.actions.get(this.stub_context, "widget")

    expect(res).to.deep.equal(this.norm_record_rels)
  })

  it("should handle an empty rels 'data' object", async function() {
    const jm = jsonapiModule(this.api, { 'follow_relationships_data': true })
    // Delete contents of data and remove links
    json_widget_1['relationships']['widgets']['data'] = {}
    delete json_widget_1['relationships']['widgets']['links']
    this.mock_api.onAny().reply(200, { data: json_widget_1 })

    let res = await jm.actions.get(this.stub_context, norm_widget_1)

    expect(res['_jv']['rels']['widgets']).to.deep.equal({})
  })

  it("should preserve json in _jv in returned data", async function() {
    const jm = jsonapiModule(this.api, { 'preserve_json': true })
    // Mock server to only return a meta section
    this.mock_api.onAny().reply(200, this.meta)

    let res = await jm.actions.get(this.stub_context, "widget")

    // json should now be nested in _jv/json
    expect(res['_jv']['json']).to.deep.equal(this.meta)
  })

  it("should not preserve json in _jv in returned data", async function() {
    const jm = jsonapiModule(this.api, { 'preserve_json': false })
    // Mock server to only return a meta section
    this.mock_api.onAny().reply(200, this.meta)

    let res = await jm.actions.get(this.stub_context, "widget")

    // collections should have no top-level _jv
    expect(res).to.not.have.key('_jv')
  })

  it("should handle API errors", async function() {
    this.mock_api.onAny().reply(500)

    try {
      await this.jm.actions.get(this.stub_context, norm_widget_1)
    } catch(error) {
      expect(error.response.status).to.equal(500)
    }
  })
})
