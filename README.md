node-abif
=========

An ABIF reader for node

sample usage
const fs = require('fs');
const {Reader} = require('abif');

let data = fs.readFileSync('./mitochondrion/chromatogram/sample.ab1';
let reader = Reader(data);
console.log('Run start date :', reader.getData('RUND', 1));
console.log('Run start time :', reader.getData('RUNT', 1));
console.log('Run stop time :', reader.getData('RUNT', 2));


Reader class

Methods
- showEntries()
Lists all entries in the ABIF file
- getData(name, num) : Gets data from the specified entry.
    - Return type depends on data
        - generally you'll get a String or a Number
        - For "time" fields, a Time object will be returned. You can call toDate() on it for easier working.
        - For "date" fields, a Javascript Date object will be returned
- seek(pos) : Seeks the read position to the specified byte position
- readData(type, num) : Reads data of a specified type and length, starting from the current read position. Use only if you understand the file format itself.

DirEntry class
Used to store entries. Entries are supposed to be used internally by Reader, unless you understand the file format itself.
(even the file format itself begins with a DirEntry, which specifies where the other DirEntries are).
