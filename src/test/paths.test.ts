import * as assert from 'assert';

import { splitPath } from '../generate/paths';

describe('Path handling', function() {
  describe('#splitPath()', function() {
    it('splits a path correctly', function() {
      assert.deepEqual(splitPath('baz.txt'), {
        atRoot: true,
        dir: 'repo root',
        name: 'baz.txt',
        extension: '.txt'
      });

      assert.deepEqual(splitPath('foo/bar/baz.txt'), {
        atRoot: false,
        dir: 'foo/bar',
        name: 'baz.txt',
        extension: '.txt'
      });
    });
  });
});
