const { Buffer } = require('buffer');

const ABIF_TYPES = {
  1: 'byte',
  2: 'char',
  3: 'word',
  4: 'short',
  5: 'long',
  7: 'float',
  8: 'double',
  10: 'date',
  11: 'time',
  12: 'thumb',
  13: 'bool',
  18: 'pString',
  19: 'cString'
};

class Time {
  /**
   * 
   * @param {Number} hour Number of hours (0-23)
   * @param {Number} minute Number of minutes (0-60)
   * @param {Number} second Number of seconds (0-60)
   * @param {Number} hsecond Number of 0.01 seconds (0-99)
   */
  constructor(hour, minute, second, hsecond) {
    this.hour = hour;
    this.minute = minute;
    this.second = second;
    this.hsecond = hsecond;
  }
  toDate() {
    var d = new Date();
    d.setHours(this.hour);
    d.setMinutes(this.minute);
    d.setSeconds(this.second);
    d.setMilliseconds(10 * this.hsecond);
    return d;
  }
}


class Reader {
  /**
   * 
   * @param {Buffer} buf 
   */
  constructor(buf) {
    this.buf = buf;
    this.pos = 0;
    this.type = this.readNextString(4);
    if (this.type !== 'ABIF') {
      console.log('this is not abif');
      return;
    }
    this.version = this.readNextShort();

    var dir = new DirEntry(this);
    this.seek(dir.dataoffset);

    /**
     * @type {[DirEntry]}
     */
    this.entries = [];
    for (var i = 0; i <= dir.numelements - 1; i++) {
      var e = new DirEntry(this);
      this.entries.push(e);
    }
  }

  showEntries() {
    this.entries.map(function (entry) {
      console.log(entry.name);
    });
  };

  /**
   * Gets the data for a DirEntry with the specified name and num
   * @param {String} name 
   * @param {Number} num 
   */
  getData(name, num) {
    if (num === undefined) {
      num = 1;
    }
    var entry = this.getEntry(name, num);
    if (!entry) {
      // throw new Error('Entry ' + name + ' (' +num + ')  not found.');
      return undefined;
    }
    this.seek(entry.mydataoffset());
    let data = this.readData(entry.elementtype, entry.numelements);
    return data.length === 1 ? data[0] : data;
  };

  /**
   * @param {String} name The name of the DirEntry to search for
   * @param {Number} num The tag number of the DirEntry to search for
   */
  getEntry(name, num) {
    /** @type {DirEntry} */
    var entry;

    this.entries.some(function (e) {
      if (e.name === name && e.number === num) {
        entry = e;
        return true;
      }
    });
    return entry;
  };

  readData(type, num) {
    var m = {
      1: 'Byte',
      3: 'UnsignedInt',
      4: 'Short',
      5: 'Long',
      7: 'Float',
      8: 'Double',
      10: 'Date',
      11: 'Time',
      12: 'Thumb',
      13: 'Bool'
    };
    // console.log('type is ',type);
    if (m[type]) {
      return this._loop(m[type], num);
    }
    else if (type === 2) {
      return this.readNextString(num);
    }
    else if (type === 18) {
      return this.readNextpString(num);
    }
    else if (type === 19) {
      return this.readNextcString(num);
    }
    else if (type >= 1024) {
      return this.readNextUser(num);
    }
    return this[m[type]](num);
  };


  /**
   * Called Internally to loop types
   * @param {String} type The type to read
   * @param {Number} num The number of times to loop-read
   */
  _loop(type, num) {
    let buf = [];
    let method = 'readNext' + type;

    for (var i = 0; i < num; i++) {
      buf.push(this[method]());
    }
    return buf;
  };


  //-----------------ReadNext methods---------------------------


  readNextShort() {
    var v = this.buf.readInt16BE(this.pos);
    this.pos += 2;
    return v;
  };
  readNextInt() {
    var v = this.buf.readInt32BE(this.pos);
    this.pos += 4;
    return v;
  };
  readNextChar() {
    var v = this.buf.toString('ascii', this.pos, this.pos + 1);
    this.pos += 1;
    return v;
  };
  readNextByte() {
    var v = this.buf.readUInt8(this.pos);
    this.pos += 1;
    return v;
  };
  readNextUnsignedInt() {
    var v = this.buf.readUInt32BE(this.pos);
    this.pos += 4;
    return v;
  };
  readNextLong() {
    var v = this.buf.readInt32BE(this.pos);
    this.pos += 4;
    return v;
  };
  readNextFloat() {
    var v = this.buf.readFloatBE(this.pos);
    this.pos += 4;
    return v;
  };
  readNextDouble() {
    var v = this.buf.readDoubleBE(this.pos);
    this.pos += 8;
    return v;
  };
  /**
   * One-byte boolean value, zero = false, any other value = true
   */
  readNextBool() {
    return this.readNextByte() === 1;
  };
  readNextDate() {
    var d = new Date();
    var y = this.readNextShort();
    var m = this.readNextByte();
    var day = this.readNextByte();

    console.log(y.m, day);
    d.setYear(y);
    d.setMonth(m);
    d.setDate(day);
    return d;
  };
  /**
   * Reads the next time structure in the data.
   * Note : Time structure has only hours, minutes, seconds, and "hseconds" (0.01 secs)
   */
  readNextTime() {
    // var d = new Date();
    // d.setHours(this.readNextByte());
    // d.setMinutes(this.readNextByte());
    // d.setSeconds(this.readNextByte());
    // d.setMilliseconds(10*this.readNextByte());
    let hour = this.readNextByte();   //hour 0-23
    let minute = this.readNextByte(); //minute 0-59
    let second = this.readNextByte(); //second 0-59
    let hsecond = this.readNextByte(); //0.01 second 0-99
    return new Time(hour, minute, second, hsecond);
  };
  /**
   * (Legacy) thumbprint data structure, designed as
   * unique file identifier
   * SInt32 d;
   * SInt32 u;
   * UInt8 c;
   * UInt8 n;
   */
  readNextThumb() {
    return [
      this.readNextLong(),
      this.readNextLong(),
      this.readNextByte(),
      this.readNextByte()
    ];
  };
  /**
   * Reads string by the specified byte size
   * @param {Number} size 
   */
  readNextString(size) {
    var chars = [];
    for (var i = 0; i <= size - 1; i++) {
      chars.push(this.readNextChar());
    }
    return chars.join('');
  };
  /**
   * Pascal string, consisting of a character count (from 0 to 255) 
   * in the first byte followed by the 8-bit ASCII characters.
   */
  readNextpString() {
    return this.readNextString(this.readNextByte());
  };
  /**
   * Reads a C-String (reads until 0 termination then returns)
   */
  readNextcString() {
    var chars = [],
      c;
    while (true) {
      c = this.readNextChar();
      if (c.charAt(0) === '\0') {
        return chars.join('');
      }
      else {
        chars.push(c);
      }
    }
  };

  readNextUser(num) {
    let res = this.buf.slice(this.pos, num);
    this.pos += num;
    return res;
  }

  /**
   * @returns {Number} the current read position
   */
  tell() {
    return this.pos;
  };

  /**
   * Seek read position to specified position
   * @param {Number} pos The position to seek to
   */
  seek(pos) {
    this.pos = pos;
  };
}

/**
 * The next 28 bytes comprise a single directory entry structure 
 * that points to the directory. 
 * A directory entry is a packed structure (no padding bytes) 
 * of the following form
 * struct DirEntry {
 *   SInt32 name; //tag name
 *   SInt32 number; //tag number
 *   SInt16 elementtype;//element type code 
 *   SInt16 elementsize;//size in bytes of one element
 *   SInt32 numelements;//number of elements in item
 *   SInt32 datasize; //size in bytes of item
 *   SInt32 dataoffset;  //item’s data, or offset in file
 *   SInt32 datahandle; //reserved
 * }
 * 
 * Your implementations that read ABIF must extract 
 * the numelements field, a 32-bit integer at byte18, 
 * and the dataoffset field, a 32-bit integer at byte 26. 
 * These specify the number of entries in the directory and 
 * the location of the directory. The other fields should be ignored
 */
class DirEntry {
  /**
   * @param {Reader} reader 
   */
  constructor(reader) {
    /** @type {String} SInt32 tag name
     * 
     * defined as an integer but this field should be treated as an array of four 8-bit ASCII characters
     */
    this.name = reader.readNextString(4);
    /** @type {Number} SInt32 tag number */
    this.number = reader.readNextInt();
    /** @type {Number} SInt16 element type code 
     * 
     * indicates the type of data contained in the data item
     * Your implementations should provide for reading all unsupported legacy element types
     * but only in the form of byte-arrays of raw data.
    */
    this.elementtype = reader.readNextShort();
    /** @type {Number} SInt16 size in bytes of one element 
     * 
     * For all supported data types, the elementsize field is redundant, 
     * since the element size for each type is uniquely defined by 
     * the specification.
     * 
     * may ignore on input, but field must be set on output.
    */
    this.elementsize = reader.readNextShort();
    /** @type {Number} SInt32 number of elements in item 
     * 
     * Gives the number of elements in the data item
     * 
     * Note that for the string types, an “element” is an individual character, not the string itself
     * 
    */
    this.numelements = reader.readNextInt();

    /** 
     * @type {Number} SInt32 gives the number of bytes in the data item. 
     * 
     * In implementations that write ABIF, the directory size 
     * (datasize) should be exactly the size 
     * required for the entries (numelements x elementsize).
     * 
     * In older implementations, there might be other data and size may be larger
    */
    this.datasize = reader.readNextInt();

    this.dataoffsetpos = reader.tell();
    /** @type {Number} SInt32 item’s data, or offset in file 
     * 
     * For data items of size greater than 4 bytes, 
     * the dataoffset field contains the offset to the data in the file.
    */
    this.dataoffset = reader.readNextInt();
    /** @type {Number} SInt32 reserved */
    this.datahandle = reader.readNextInt();
  }
  /**
   * For data items of size greater than 4 bytes, 
   * the dataoffset field contains the offset to the data in the file.
   * 
   * For data items of 4 bytes or less, the dataoffset field 
   * contains the data item itself. In this case, the data bytes 
   * are stored beginning at the high-order byte of the 32-bit field. 
   * 
   */
  mydataoffset() {
    return (this.datasize <= 4) ? this.dataoffsetpos : this.dataoffset;
  }
  /** 
   * The 'type' of this entry (e.g. cString, pString, short, etc.)
   * @returns {String} 
   * */
  mytype() {
    return (this.elementtype < 1024) ? ABIF_TYPES[this.elementtype] || 'unknown' : 'user';
  }
}

// http://cpansearch.perl.org/src/VITA/Bio-Trace-ABIF-1.05/lib/Bio/Trace/ABIF.pm

Reader.prototype.getAnalyzedDataForChannel = function (channel) {
  if (channel === 5) {
    channel = 205;
  }
  else {
    channel += 8;
  }
  if (channel < 9 || (channel > 12 && channel != 205)) {
    return null;
  }
  return this.getEntry('DATA', channel);
};

Reader.prototype.getBaseOrder = function () {
  return this.getData('FWO_').split('');
};

Reader.prototype.getChannel = function (base) {
  base = base.toUpperCase();
  var order = this.getBaseOrder();
  for (var i = 0; i <= order.length; i++) {
    if (order[i] === base) {
      return i + 1;
    }
  }
  return undefined;
};

Reader.prototype.getPeaks = function () {
  // sub peaks {
  //     my ($self, $n) = @_;
  //     my $k = '_PEAK' . $n;
  //     my ($position, $height, $beginPos, $endPos, $beginHI, $endHI, $area, $volume, $fragSize, $isEdited, $label);
  //     my $s = undef;
  //     my @raw_data;
  //     my @peak_array;
  //     my $i;

  //     unless (defined $self->{$k}) {
  //         @raw_data = $self->get_data_item('PEAK', $n, '(NnNNnnNNB32nZ64)*');
  //         for ($i = 0; $i < @raw_data; $i += 11) {
  //             ($position, $height, $beginPos, $endPos, $beginHI, $endHI, $area, $volume, $s, $isEdited, $label) = @raw_data[$i .. $i+10];
  //             $fragSize = $self->_ieee2decimal($s) if (defined $s);
  //             my $peak = {};
  //             $peak->{position} = $position;
  //             $peak->{height} = $height;
  //             $peak->{beginPos} = $beginPos;
  //             $peak->{endPos} = $endPos;
  //             $peak->{beginHI} = $beginHI;
  //             $peak->{endHI} = $endHI;
  //             $peak->{area} = $area;
  //             $peak->{volume} = $volume;
  //             $peak->{fragSize} = $fragSize;
  //             $peak->{isEdited} = $isEdited;
  //             $peak->{label} = $label;
  //             push @peak_array, $peak;
  //         }
  //     $self->{$k} = (@peak_array) ? [ @peak_array ] : [ ];
  //     }
  //     return @{$self->{$k}};
  // }
};

Reader.prototype.getRawDataForChannel = function (channel) {
  // sub  raw_data_for_channel {
  //     my ($self, $channel_number) = @_;
  //     if ($channel_number == 5) {
  //         $channel_number = 105;
  //     }
  //     if ($channel_number < 1 or
  //         ($channel_number > 5 and $channel_number != 105)) {
  //         return ();
  //     }
  //     my $k = '_DATA' . $channel_number;
  //     unless (defined $self->{$k}) {
  //         my @data = map { ($_ < $SHORT_MID) ? $_ : $_ - $SHORT_MAX }
  //             $self->get_data_item('DATA', $channel_number, 'n*');
  //         $self->{$k} = (@data) ? [ @data ] : [ ];
  //     }

  //     return @{$self->{$k}};
  // }
};

Reader.prototype.getRawTrace = function (base) {
  // sub raw_trace {
  //     my ($self, $base) = @_;
  //     my %ob = ();

  //     $base =~ /^[ACGTacgt]$/ or return ();
  //     %ob = $self->order_base();
  //     return $self->raw_data_for_channel($ob{uc($base)});
  // }
};

Reader.prototype.getTrace = function (base) {
  // sub trace {
  //     my ($self, $base) = @_;
  //     my %ob = ();

  //     $base =~ /^[ACGTacgt]$/ or return ();
  //     %ob = $self->order_base();
  //     return $self->analyzed_data_for_channel($ob{uc($base)});
  // }

};

// These are all just simple tag reads.
// Keeping this as a simple map for anyone else's reference.
// Don't worry.  They'll get all nice and camel cased below.
var accessors = {
  'analysis_protocol_settings_name': 'APrN',
  'analysis_protocol_settings_version': 'APrV',
  'analysis_protocol_xml': 'APrX',
  'analysis_protocol_xml_schema_version': 'APXV',
  'analysis_return_code': 'ARTN',
  'average_peak_spacing': 'SPAC',
  'basecaller_apsf': 'ASPF',
  'basecaller_bcp_dll': ['SPAC', 2],
  'basecaller_version': ['SVER', 2],
  'basecalling_analysis_timestamp': 'BCTS',
  'base_locations': ['PLOC', 2],
  'base_locations_edited': 'PLOC',
  'base_spacing': ['SPAC', 3],
  'buffer_tray_temperature': 'BufT',
  'capillary_number': 'LANE',
  'chem': 'phCH',
  'comment': 'CMNT',
  'comment_title': 'CTTL',
  'container_identifier': 'CTID',
  'container_name': 'CTNM',
  'container_owner': 'CTOw',
  'current': ['DATA', 6],
  'data_collection_module_file': 'MODF',
  'data_collection_software_version': 'SVER',
  'data_collection_firmware_version': ['SVER', 3],
  'data_collection_start_date': ['RUND', 3],
  'data_collection_start_time': ['RUNT', 3],
  'data_collection_stop_date': ['RUND', 4],
  'data_collection_stop_time': ['RUNT', 4],
  'detector_heater_temperature': 'DCHT',
  'downsampling_factor': 'DSam',
  'dye_name': 'DyeN',
  'dye_set_name': 'DySN',
  'dye_significance': 'DyeB',
  'dye_type': 'phDY',
  'dye_wavelength': 'DyeW',
  'edited_quality_values': 'PCON',
  'edited_quality_values_ref': 'PCON',
  'edited_sequence': 'PBAS',
  'edited_sequence_length': 'PBAS',
  'electrophoresis_voltage': 'EPVt',
  'gel_type': 'GTyp',
  'gene_mapper_analysis_method': 'ANME',
  'gene_mapper_panel_name': 'PANL',
  'gene_mapper_sample_type': 'STYP',
  'gene_scan_sample_name': 'SpNm',
  'injection_time': 'InSc',
  'injection_voltage': 'InVt',
  'instrument_class': 'HCFG',
  'instrument_family': ['HCFG', 2],
  'instrument_name_and_serial_number': 'MCHN',
  'instrument_param': ['HCFG', 4],
  'is_capillary_machine': 'CpEP',
  'laser_power': 'LsrP',
  'length_to_detector': 'LNTD',
  'mobility_file': ['PDMF', 2],
  'mobility_file_orig': 'PDMF',
  'model_number': 'MODL',
  'noise': 'NOIS',
  'num_capillaries': 'NLNE',
  'num_dyes': 'Dye#',
  'num_scans': 'SCAN',
  'official_instrument_name': ['HCFG', 3],
  'offscale_peaks': 'OffS',
  'offscale_scans': 'OfSc',
  'peak1_location': ['B1Pt', 2],
  'peak1_location_orig': 'B1Pt',
  'peak_area_ratio': 'phAR',
  'pixel_bin_size': 'PXLB',
  'pixels_lane': 'NAVG',
  'plate_type': 'PTYP',
  'plate_size': 'PSZE',
  'polymer_expiration_date': 'SMED',
  'polymer_lot_number': 'SMLt',
  'power': ['DATA', 7],
  'quality_levels': 'phQL',
  'quality_values': ['PCON', 2],
  'quality_values_ref': ['PCON', 2],
  'rescaling': 'Scal',
  'results_group': 'RGNm',
  'results_group_comment': 'RGCm',
  'results_group_owner': 'RGOw',
  'reverse_complement_flag': 'RevC',
  'run_module_name': 'RMdN',
  'run_module_version': 'RMdV',
  'run_module_xml_schema_version': 'RMXV',
  'run_module_xml_string': 'RMdX',
  'run_name': 'RunN',
  'run_protocol_name': 'RPrN',
  'run_protocol_version': 'RPrV',
  'run_start_date': 'RUND',
  'run_start_time': 'RUNT',
  'run_stop_date': ['RUND', 2],
  'run_stop_time': ['RUNT', 2],
  'run_temperature': 'Tmpr',
  'sample_file_format_version': ['SVER', 4],
  'sample_name': 'SMPL',
  'sample_tracking_id': 'LIMS',
  'scanning_rate': 'Rate',
  'scan_color_data_values': 'OvrV',
  'scan_numbers': 'Satd',
  'scan_number_indices': 'OvrI',
  'seqscape_project_name': ['PROJ', 4],
  'seqscape_project_template': 'PRJT',
  'seqscape_specimen_name': 'SPEC',
  'sequence': ['PBAS', 2],
  'sequence_length': ['PBAS', 2],
  'sequencing_analysis_param_filename': ['APFN', 2],
  'signal_level': 'S/N%',
  'size_standard_filename': 'StdF',
  'snp_set_name': 'SnpS',
  'start_collection_event': ['EVNT', 3],
  'start_point': ['ASPt', 2],
  'start_point_orig': 'ASPt',
  'start_run_event': 'EVNT',
  'stop_collection_event': ['EVNT', 4],
  'stop_point': ['AEPt', 2],
  'stop_point_orig': 'AEPt',
  'stop_run_event': ['EVNT', 2],
  'temperature': ['DATA', 8],
  'trim_probability_threshold': ['phTR', 2],
  'trim_region': 'phTR',
  'voltage': ['DATA', 5],
  'user': 'User',
  'well_id': 'TUBE'
};

Object.keys(accessors).map(function (accessor) {
  var regexp = /[-_]([a-z])/g;
  var name = accessor.replace(regexp, function (match, c) {
    return c.toUpperCase();
  });
  name = name.charAt(0).toUpperCase() + name.substring(1);

  var args = accessors[accessor];
  if (!Array.isArray(args)) {
    args = [args];
  }

  Reader.prototype['get' + name] = function () {
    return this.getData.apply(this, args);
  };

});

module.exports = {
  Reader
}