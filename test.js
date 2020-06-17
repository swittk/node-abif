const {Reader} = require('./index.js');
const fs = require('fs');

let ab1file = fs.readFileSync('/Users/swittkongdachalert/Dropbox/Shared Lice Research/Missing Data M2/180704FN-074/180709-015_E15_M2-2_T7promoter.ab1');

let r = new Reader(ab1file);

r.getData('PBAS', 1)

r.getData('Rate', 1)