// GasWatch PH — Community Price Overrides
// Per-station community-reported prices
// Updated: March 31, 2026 | 757 stations with community prices
// Keys: data.js station ID ? fuel type ? {p: price, r: 1=community/0=official}
const STATION_OVERRIDES = {
  "1": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "10": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "13": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "23": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "30": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "31": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "35": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "36": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "39": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "43": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "53": {
    "diesel": {
      "p": 130.4,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.4,
      "r": 0
    },
    "premium95": {
      "p": 94.9,
      "r": 0
    }
  },
  "56": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "59": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "63": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "67": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "72": {
    "diesel": {
      "p": 132.5,
      "r": 0
    },
    "premiumDiesel": {
      "p": 135.5,
      "r": 0
    },
    "premium95": {
      "p": 96.4,
      "r": 0
    },
    "premium97": {
      "p": 104.1,
      "r": 0
    }
  },
  "104": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "109": {
    "diesel": {
      "p": 131.5,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "112": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 98.3,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "113": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "114": {
    "diesel": {
      "p": 127.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 130.8,
      "r": 0
    },
    "unleaded": {
      "p": 96.4,
      "r": 0
    },
    "premium95": {
      "p": 98.4,
      "r": 0
    },
    "premium97": {
      "p": 107,
      "r": 0
    }
  },
  "116": {
    "diesel": {
      "p": 127.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 96.9,
      "r": 0
    }
  },
  "117": {
    "diesel": {
      "p": 137.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 140.9,
      "r": 0
    },
    "unleaded": {
      "p": 100.3,
      "r": 0
    },
    "premium95": {
      "p": 102.3,
      "r": 0
    }
  },
  "134": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "136": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "138": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 88,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "140": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "141": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "142": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "161": {
    "diesel": {
      "p": 140.3,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "167": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "172": {
    "diesel": {
      "p": 136.2,
      "r": 0
    },
    "premiumDiesel": {
      "p": 145.9,
      "r": 0
    },
    "unleaded": {
      "p": 97.3,
      "r": 0
    },
    "premium95": {
      "p": 104.8,
      "r": 0
    },
    "premium97": {
      "p": 108,
      "r": 0
    }
  },
  "174": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "175": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "178": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "186": {
    "diesel": {
      "p": 131.2,
      "r": 0
    },
    "premium95": {
      "p": 94.7,
      "r": 0
    }
  },
  "189": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "190": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 97.9,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "191": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "197": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "199": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "200": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "203": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "205": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "211": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "219": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "221": {
    "diesel": {
      "p": 129.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 132.9,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    },
    "premium97": {
      "p": 102.9,
      "r": 0
    }
  },
  "225": {
    "diesel": {
      "p": 131.7,
      "r": 0
    },
    "premiumDiesel": {
      "p": 134.7,
      "r": 0
    },
    "unleaded": {
      "p": 91.9,
      "r": 0
    },
    "premium95": {
      "p": 93.9,
      "r": 0
    },
    "premium97": {
      "p": 102.9,
      "r": 0
    }
  },
  "228": {
    "diesel": {
      "p": 136.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 146.5,
      "r": 0
    },
    "unleaded": {
      "p": 98.8,
      "r": 0
    },
    "premium95": {
      "p": 106.3,
      "r": 0
    },
    "premium97": {
      "p": 109.4,
      "r": 0
    }
  },
  "229": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "235": {
    "diesel": {
      "p": 131.9,
      "r": 0
    },
    "unleaded": {
      "p": 94.8,
      "r": 0
    },
    "premium95": {
      "p": 97.8,
      "r": 0
    }
  },
  "237": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    },
    "premium95": {
      "p": 108.1,
      "r": 0
    }
  },
  "238": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "239": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "240": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "241": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 150.4,
      "r": 0
    },
    "unleaded": {
      "p": 99.9,
      "r": 0
    }
  },
  "242": {
    "diesel": {
      "p": 135.3,
      "r": 0
    },
    "premiumDiesel": {
      "p": 146.9,
      "r": 0
    },
    "premium95": {
      "p": 99,
      "r": 0
    },
    "premium97": {
      "p": 107.3,
      "r": 0
    }
  },
  "243": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 134.1,
      "r": 0
    },
    "unleaded": {
      "p": 94.3,
      "r": 0
    },
    "premium95": {
      "p": 96.3,
      "r": 0
    },
    "premium97": {
      "p": 106.1,
      "r": 0
    }
  },
  "244": {
    "diesel": {
      "p": 131.5,
      "r": 0
    },
    "premiumDiesel": {
      "p": 134.6,
      "r": 0
    },
    "unleaded": {
      "p": 95.4,
      "r": 0
    },
    "premium95": {
      "p": 97.5,
      "r": 0
    },
    "premium97": {
      "p": 111.1,
      "r": 0
    }
  },
  "245": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "246": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 92.7,
      "r": 0
    }
  },
  "247": {
    "diesel": {
      "p": 131.5,
      "r": 0
    },
    "premiumDiesel": {
      "p": 134.5,
      "r": 0
    },
    "unleaded": {
      "p": 94.1,
      "r": 0
    },
    "premium95": {
      "p": 96.1,
      "r": 0
    },
    "premium97": {
      "p": 106.9,
      "r": 0
    }
  },
  "249": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 94.1,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "250": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 90.9,
      "r": 0
    },
    "premium95": {
      "p": 92.7,
      "r": 0
    }
  },
  "253": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "255": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "256": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "257": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 95.59,
      "r": 0
    },
    "premium95": {
      "p": 100.15,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "259": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "260": {
    "diesel": {
      "p": 132.2,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "261": {
    "diesel": {
      "p": 131,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 90.8,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 91,
      "r": 0
    }
  },
  "262": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "263": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "264": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.4,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "265": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "266": {
    "diesel": {
      "p": 131.6,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "267": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "270": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "272": {
    "diesel": {
      "p": 131.7,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "273": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "274": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "275": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "276": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 95.4,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "281": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "282": {
    "diesel": {
      "p": 132.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 135.8,
      "r": 0
    },
    "unleaded": {
      "p": 93.3,
      "r": 0
    },
    "premium97": {
      "p": 106.4,
      "r": 0
    }
  },
  "283": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "284": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "285": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "286": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "287": {
    "diesel": {
      "p": 138.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 149.9,
      "r": 0
    },
    "unleaded": {
      "p": 100.6,
      "r": 0
    },
    "premium95": {
      "p": 109.1,
      "r": 0
    },
    "premium97": {
      "p": 112.1,
      "r": 0
    }
  },
  "288": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 92.3,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "289": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "290": {
    "diesel": {
      "p": 132,
      "r": 0
    },
    "premiumDiesel": {
      "p": 135,
      "r": 0
    },
    "unleaded": {
      "p": 96.4,
      "r": 0
    },
    "premium95": {
      "p": 98.4,
      "r": 0
    }
  },
  "291": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "292": {
    "diesel": {
      "p": 131.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "293": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "294": {
    "diesel": {
      "p": 135.2,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "295": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "296": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "297": {
    "diesel": {
      "p": 103.8,
      "r": 0
    }
  },
  "298": {
    "diesel": {
      "p": 133.2,
      "r": 0
    },
    "unleaded": {
      "p": 95.4,
      "r": 0
    },
    "premium95": {
      "p": 98.4,
      "r": 0
    }
  },
  "299": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "301": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 94.1,
      "r": 0
    }
  },
  "302": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 92.3,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "303": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "304": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 92.3,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "305": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 135,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "306": {
    "diesel": {
      "p": 131.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 95.9,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "309": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "310": {
    "diesel": {
      "p": 138.4,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    },
    "unleaded": {
      "p": 99,
      "r": 0
    },
    "premium95": {
      "p": 108,
      "r": 0
    },
    "premium97": {
      "p": 109.7,
      "r": 0
    }
  },
  "311": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "313": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.2,
      "r": 0
    },
    "unleaded": {
      "p": 87.2,
      "r": 0
    },
    "premium95": {
      "p": 89.2,
      "r": 0
    },
    "premium97": {
      "p": 89.7,
      "r": 0
    }
  },
  "316": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "317": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "320": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "321": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "323": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 134.7,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "324": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 97.7,
      "r": 0
    }
  },
  "325": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "326": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "327": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "328": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "330": {
    "unleaded": {
      "p": 85.9,
      "r": 0
    },
    "premium95": {
      "p": 87.9,
      "r": 0
    }
  },
  "331": {
    "diesel": {
      "p": 121.8,
      "r": 0
    },
    "unleaded": {
      "p": 83.9,
      "r": 0
    },
    "premium95": {
      "p": 84.4,
      "r": 0
    }
  },
  "332": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "336": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "337": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "339": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "340": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "341": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "342": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "345": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "347": {
    "diesel": {
      "p": 137.2,
      "r": 0
    },
    "premiumDiesel": {
      "p": 146.1,
      "r": 0
    }
  },
  "348": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "350": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "351": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "354": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 134.1,
      "r": 0
    },
    "unleaded": {
      "p": 93.7,
      "r": 0
    },
    "premium95": {
      "p": 95.8,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "356": {
    "diesel": {
      "p": 133.2,
      "r": 0
    },
    "premiumDiesel": {
      "p": 136.2,
      "r": 0
    },
    "unleaded": {
      "p": 91.6,
      "r": 0
    },
    "premium95": {
      "p": 93.6,
      "r": 0
    },
    "premium97": {
      "p": 103.6,
      "r": 0
    }
  },
  "357": {
    "diesel": {
      "p": 130.7,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 93.8,
      "r": 0
    },
    "premium95": {
      "p": 95.8,
      "r": 0
    }
  },
  "358": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "359": {
    "diesel": {
      "p": 130.4,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.4,
      "r": 0
    },
    "unleaded": {
      "p": 93,
      "r": 0
    },
    "premium95": {
      "p": 95,
      "r": 0
    }
  },
  "360": {
    "diesel": {
      "p": 133.2,
      "r": 0
    },
    "premiumDiesel": {
      "p": 136.2,
      "r": 0
    },
    "unleaded": {
      "p": 94,
      "r": 0
    },
    "premium95": {
      "p": 93.6,
      "r": 0
    },
    "premium97": {
      "p": 103.1,
      "r": 0
    }
  },
  "361": {
    "diesel": {
      "p": 131.5,
      "r": 0
    },
    "premiumDiesel": {
      "p": 134.6,
      "r": 0
    },
    "unleaded": {
      "p": 95.3,
      "r": 0
    },
    "premium95": {
      "p": 97.3,
      "r": 0
    },
    "premium97": {
      "p": 104.1,
      "r": 0
    }
  },
  "363": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 97.25,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "365": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "366": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "371": {
    "diesel": {
      "p": 131.7,
      "r": 0
    },
    "unleaded": {
      "p": 93.2,
      "r": 0
    },
    "premium95": {
      "p": 93.7,
      "r": 0
    }
  },
  "374": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "375": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "379": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "380": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "381": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "383": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "384": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "385": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "386": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "387": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "388": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "389": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "390": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "391": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "392": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 101.5,
      "r": 0
    },
    "premium95": {
      "p": 102.9,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "394": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "395": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "396": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "397": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "399": {
    "diesel": {
      "p": 141.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "400": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "401": {
    "diesel": {
      "p": 122,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 89.5,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 88.7,
      "r": 0
    }
  },
  "402": {
    "diesel": {
      "p": 133.7,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "404": {
    "diesel": {
      "p": 134.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "405": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "406": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 107.9,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "407": {
    "diesel": {
      "p": 133.98,
      "r": 0
    },
    "unleaded": {
      "p": 93.7,
      "r": 0
    },
    "premium95": {
      "p": 93.98,
      "r": 0
    }
  },
  "408": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "409": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "410": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "411": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "412": {
    "diesel": {
      "p": 127.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 94.5,
      "r": 0
    },
    "premium95": {
      "p": 98.7,
      "r": 0
    },
    "premium97": {
      "p": 103.5,
      "r": 0
    }
  },
  "414": {
    "diesel": {
      "p": 134.3,
      "r": 0
    },
    "unleaded": {
      "p": 94.8,
      "r": 0
    },
    "premium95": {
      "p": 98.28,
      "r": 0
    }
  },
  "415": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "416": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    },
    "unleaded": {
      "p": 101.9,
      "r": 0
    }
  },
  "417": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    },
    "unleaded": {
      "p": 101.1,
      "r": 0
    }
  },
  "418": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "420": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    },
    "premium95": {
      "p": 108.5,
      "r": 0
    }
  },
  "421": {
    "diesel": {
      "p": 139.96,
      "r": 0
    },
    "premiumDiesel": {
      "p": 142.96,
      "r": 0
    },
    "unleaded": {
      "p": 101.9,
      "r": 0
    },
    "premium95": {
      "p": 105.35,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "422": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "423": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "424": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "425": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 95.9,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "426": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "427": {
    "diesel": {
      "p": 138.6,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "428": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "429": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "430": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "431": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "432": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "433": {
    "diesel": {
      "p": 135.7,
      "r": 0
    },
    "premiumDiesel": {
      "p": 149.3,
      "r": 0
    },
    "unleaded": {
      "p": 102.3,
      "r": 0
    },
    "premium95": {
      "p": 109.8,
      "r": 0
    },
    "premium97": {
      "p": 112.8,
      "r": 0
    }
  },
  "434": {
    "diesel": {
      "p": 137.9,
      "r": 0
    },
    "unleaded": {
      "p": 101.1,
      "r": 0
    },
    "premium95": {
      "p": 103.9,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "435": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "436": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "437": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "438": {
    "diesel": {
      "p": 132.4,
      "r": 0
    },
    "premiumDiesel": {
      "p": 135.4,
      "r": 0
    },
    "unleaded": {
      "p": 94,
      "r": 0
    },
    "premium95": {
      "p": 96,
      "r": 0
    },
    "premium97": {
      "p": 104.5,
      "r": 0
    }
  },
  "439": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "440": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "441": {
    "diesel": {
      "p": 133.4,
      "r": 0
    },
    "unleaded": {
      "p": 98.4,
      "r": 0
    },
    "premium95": {
      "p": 101.6,
      "r": 0
    },
    "premium97": {
      "p": 102.9,
      "r": 0
    }
  },
  "444": {
    "diesel": {
      "p": 131.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 96.4,
      "r": 0
    },
    "premium95": {
      "p": 98.4,
      "r": 0
    },
    "premium97": {
      "p": 107,
      "r": 0
    }
  },
  "445": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "447": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "448": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "450": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "451": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "452": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "453": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "454": {
    "diesel": {
      "p": 124.6,
      "r": 0
    },
    "unleaded": {
      "p": 83.4,
      "r": 0
    },
    "premium95": {
      "p": 84.5,
      "r": 0
    }
  },
  "455": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "456": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "457": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "458": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "459": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "460": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "461": {
    "diesel": {
      "p": 131.94,
      "r": 0
    },
    "unleaded": {
      "p": 92.6,
      "r": 0
    },
    "premium95": {
      "p": 94.1,
      "r": 0
    }
  },
  "462": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "463": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "464": {
    "diesel": {
      "p": 138.4,
      "r": 0
    },
    "premiumDiesel": {
      "p": 148.3,
      "r": 0
    },
    "unleaded": {
      "p": 99,
      "r": 0
    },
    "premium95": {
      "p": 106.6,
      "r": 0
    },
    "premium97": {
      "p": 108.4,
      "r": 0
    }
  },
  "465": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "466": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "467": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "468": {
    "diesel": {
      "p": 131.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "469": {
    "diesel": {
      "p": 131.7,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 92.9,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "470": {
    "diesel": {
      "p": 132.7,
      "r": 0
    },
    "premiumDiesel": {
      "p": 135.7,
      "r": 0
    },
    "unleaded": {
      "p": 94,
      "r": 0
    },
    "premium95": {
      "p": 96,
      "r": 0
    }
  },
  "471": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "473": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "474": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "475": {
    "diesel": {
      "p": 140.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "476": {
    "diesel": {
      "p": 132.7,
      "r": 0
    },
    "premiumDiesel": {
      "p": 135.7,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 93.1,
      "r": 0
    }
  },
  "477": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 85.2,
      "r": 0
    },
    "premium95": {
      "p": 87.4,
      "r": 0
    },
    "premium97": {
      "p": 87.3,
      "r": 0
    }
  },
  "478": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "479": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "480": {
    "diesel": {
      "p": 133.7,
      "r": 0
    },
    "unleaded": {
      "p": 93.6,
      "r": 0
    },
    "premium95": {
      "p": 94.1,
      "r": 0
    }
  },
  "481": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    },
    "unleaded": {
      "p": 101.6,
      "r": 0
    }
  },
  "482": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "483": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "484": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "485": {
    "diesel": {
      "p": 130.5,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "486": {
    "diesel": {
      "p": 138.4,
      "r": 0
    },
    "premiumDiesel": {
      "p": 148.3,
      "r": 0
    },
    "unleaded": {
      "p": 98.55,
      "r": 0
    },
    "premium95": {
      "p": 106.2,
      "r": 0
    },
    "premium97": {
      "p": 108.5,
      "r": 0
    }
  },
  "487": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "488": {
    "diesel": {
      "p": 124.5,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "489": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 90.6,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "490": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "492": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "494": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 96.1,
      "r": 0
    }
  },
  "496": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "497": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "498": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    },
    "unleaded": {
      "p": 100.3,
      "r": 0
    }
  },
  "500": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "502": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "503": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "504": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "505": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "506": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "507": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "509": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "510": {
    "diesel": {
      "p": 136.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 99.62,
      "r": 0
    },
    "premium95": {
      "p": 103.02,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "511": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "512": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "513": {
    "diesel": {
      "p": 135.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.7,
      "r": 0
    },
    "unleaded": {
      "p": 97.6,
      "r": 0
    },
    "premium95": {
      "p": 99.7,
      "r": 0
    }
  },
  "514": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "515": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "516": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "517": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "518": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "520": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 97.2,
      "r": 0
    }
  },
  "521": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 97.5,
      "r": 0
    }
  },
  "522": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    },
    "unleaded": {
      "p": 100.3,
      "r": 0
    }
  },
  "524": {
    "diesel": {
      "p": 130.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 134.1,
      "r": 0
    },
    "unleaded": {
      "p": 93.5,
      "r": 0
    },
    "premium95": {
      "p": 95.6,
      "r": 0
    },
    "premium97": {
      "p": 105.15,
      "r": 0
    }
  },
  "525": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "526": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "527": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "528": {
    "diesel": {
      "p": 131,
      "r": 0
    },
    "premiumDiesel": {
      "p": 134,
      "r": 0
    },
    "unleaded": {
      "p": 92.5,
      "r": 0
    },
    "premium95": {
      "p": 94.4,
      "r": 0
    },
    "premium97": {
      "p": 105,
      "r": 0
    }
  },
  "529": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 92.1,
      "r": 0
    },
    "premium95": {
      "p": 94.4,
      "r": 0
    }
  },
  "530": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "531": {
    "diesel": {
      "p": 134.3,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    },
    "unleaded": {
      "p": 103.1,
      "r": 0
    }
  },
  "532": {
    "diesel": {
      "p": 140.6,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "533": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "534": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "535": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "536": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "537": {
    "diesel": {
      "p": 131,
      "r": 0
    },
    "premiumDiesel": {
      "p": 134,
      "r": 0
    },
    "unleaded": {
      "p": 92.4,
      "r": 0
    },
    "premium95": {
      "p": 94.5,
      "r": 0
    }
  },
  "539": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "540": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 86.9,
      "r": 1
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "541": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "542": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "543": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "545": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "546": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "548": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "549": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "550": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "552": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "554": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "556": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "557": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "558": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "560": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "561": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "562": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "565": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "566": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "567": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "568": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "569": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "570": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "572": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "573": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "574": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "575": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "577": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "578": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 92.9,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "579": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "580": {
    "diesel": {
      "p": 134.7,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "581": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 83.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 84.1,
      "r": 0
    }
  },
  "582": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "584": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "585": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "586": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "587": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "588": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "589": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "591": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "592": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "593": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 89.4,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "594": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "595": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "596": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 83.9,
      "r": 0
    },
    "premium95": {
      "p": 89.39,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "597": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "598": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "599": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 94.9,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "600": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "602": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "603": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "604": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "605": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "606": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "608": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "609": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "610": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "611": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "612": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "613": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "614": {
    "diesel": {
      "p": 130.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.8,
      "r": 0
    },
    "unleaded": {
      "p": 93.9,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    }
  },
  "615": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "616": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "617": {
    "diesel": {
      "p": 135.75,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 98.1,
      "r": 0
    },
    "premium95": {
      "p": 104.9,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "618": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "621": {
    "diesel": {
      "p": 130.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 93.9,
      "r": 0
    },
    "premium95": {
      "p": 96.9,
      "r": 0
    }
  },
  "623": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    },
    "unleaded": {
      "p": 99.7,
      "r": 0
    }
  },
  "624": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "627": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "630": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "631": {
    "diesel": {
      "p": 138.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    },
    "unleaded": {
      "p": 98.6,
      "r": 0
    },
    "premium95": {
      "p": 107.4,
      "r": 0
    },
    "premium97": {
      "p": 108,
      "r": 0
    }
  },
  "632": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "635": {
    "diesel": {
      "p": 131.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 134.9,
      "r": 0
    },
    "unleaded": {
      "p": 95.1,
      "r": 0
    },
    "premium95": {
      "p": 97.1,
      "r": 0
    }
  },
  "636": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "637": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "638": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 97.1,
      "r": 0
    }
  },
  "641": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "643": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "644": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "645": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    },
    "unleaded": {
      "p": 99.7,
      "r": 0
    }
  },
  "646": {
    "diesel": {
      "p": 130.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.8,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "648": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "649": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 88.9,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "651": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 92.5,
      "r": 0
    },
    "premium95": {
      "p": 94.4,
      "r": 0
    }
  },
  "653": {
    "diesel": {
      "p": 138.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 148,
      "r": 0
    },
    "unleaded": {
      "p": 99.7,
      "r": 0
    },
    "premium95": {
      "p": 106.5,
      "r": 0
    },
    "premium97": {
      "p": 109.1,
      "r": 0
    }
  },
  "654": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "655": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 82.69,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "656": {
    "diesel": {
      "p": 130.05,
      "r": 0
    },
    "premiumDiesel": {
      "p": 132.05,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "657": {
    "diesel": {
      "p": 132,
      "r": 0
    },
    "premiumDiesel": {
      "p": 134.9,
      "r": 0
    },
    "unleaded": {
      "p": 95.1,
      "r": 0
    },
    "premium95": {
      "p": 97.1,
      "r": 0
    }
  },
  "658": {
    "unleaded": {
      "p": 82.6,
      "r": 0
    },
    "premium95": {
      "p": 83.1,
      "r": 0
    }
  },
  "660": {
    "diesel": {
      "p": 135.7,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.7,
      "r": 0
    },
    "unleaded": {
      "p": 97.6,
      "r": 0
    },
    "premium95": {
      "p": 99.6,
      "r": 0
    }
  },
  "661": {
    "diesel": {
      "p": 132.5,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "663": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "664": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "665": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "666": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "667": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "668": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "669": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "670": {
    "diesel": {
      "p": 145.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 103.7,
      "r": 0
    },
    "premium95": {
      "p": 107.6,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "671": {
    "diesel": {
      "p": 138.2,
      "r": 0
    },
    "premiumDiesel": {
      "p": 146.2,
      "r": 0
    },
    "unleaded": {
      "p": 99.6,
      "r": 0
    },
    "premium95": {
      "p": 106.1,
      "r": 0
    },
    "premium97": {
      "p": 108.8,
      "r": 0
    }
  },
  "673": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    },
    "unleaded": {
      "p": 100.7,
      "r": 0
    }
  },
  "674": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "675": {
    "diesel": {
      "p": 137.5,
      "r": 0
    },
    "premiumDiesel": {
      "p": 149.5,
      "r": 0
    },
    "unleaded": {
      "p": 102,
      "r": 0
    },
    "premium95": {
      "p": 107.4,
      "r": 0
    }
  },
  "677": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "678": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "679": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "682": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "684": {
    "diesel": {
      "p": 129.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "685": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "686": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "687": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "689": {
    "diesel": {
      "p": 112.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 96.9,
      "r": 0
    }
  },
  "690": {
    "diesel": {
      "p": 120.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    },
    "unleaded": {
      "p": 100.4,
      "r": 0
    }
  },
  "691": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "692": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 87.6,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "693": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "694": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "695": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "696": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "698": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "700": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "701": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "703": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "704": {
    "diesel": {
      "p": 132,
      "r": 0
    },
    "premiumDiesel": {
      "p": 135,
      "r": 0
    },
    "unleaded": {
      "p": 96.9,
      "r": 0
    },
    "premium95": {
      "p": 98.9,
      "r": 0
    },
    "premium97": {
      "p": 108.3,
      "r": 0
    }
  },
  "705": {
    "diesel": {
      "p": 122.4,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 85.9,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 86.9,
      "r": 0
    }
  },
  "706": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "707": {
    "premium95": {
      "p": 93.8,
      "r": 0
    }
  },
  "708": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "711": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "712": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "713": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "714": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "715": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "716": {
    "diesel": {
      "p": 127,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 84.5,
      "r": 0
    },
    "premium95": {
      "p": 85.5,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "717": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "719": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 81,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 82.5,
      "r": 0
    }
  },
  "720": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "721": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "722": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 93.9,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "723": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "724": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "728": {
    "diesel": {
      "p": 134.5,
      "r": 0
    },
    "unleaded": {
      "p": 101.8,
      "r": 0
    },
    "premium95": {
      "p": 109.3,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "730": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "734": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "736": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "738": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "739": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "740": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "742": {
    "diesel": {
      "p": 131.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 134.9,
      "r": 0
    },
    "unleaded": {
      "p": 95.1,
      "r": 0
    },
    "premium95": {
      "p": 97.1,
      "r": 0
    }
  },
  "743": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "744": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 94.8,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "745": {
    "diesel": {
      "p": 144.2,
      "r": 0
    },
    "premiumDiesel": {
      "p": 152.5,
      "r": 0
    },
    "unleaded": {
      "p": 97.2,
      "r": 0
    },
    "premium95": {
      "p": 103.25,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "746": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "747": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "748": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "749": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 92.3,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "750": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "751": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "752": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "753": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "754": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "755": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "756": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 82.69,
      "r": 0
    }
  },
  "764": {
    "diesel": {
      "p": 131.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 134.9,
      "r": 0
    },
    "unleaded": {
      "p": 93.9,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    }
  },
  "770": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "771": {
    "diesel": {
      "p": 137.95,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "773": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    },
    "unleaded": {
      "p": 97.8,
      "r": 0
    }
  },
  "774": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "775": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "776": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 86.5,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 87.5,
      "r": 0
    }
  },
  "780": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "782": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "784": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "785": {
    "diesel": {
      "p": 132.5,
      "r": 0
    },
    "unleaded": {
      "p": 84.1,
      "r": 0
    },
    "premium95": {
      "p": 84.6,
      "r": 0
    },
    "premium97": {
      "p": 86.1,
      "r": 0
    }
  },
  "789": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "792": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "795": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 143.9,
      "r": 0
    },
    "unleaded": {
      "p": 98.7,
      "r": 0
    },
    "premium95": {
      "p": 106.2,
      "r": 0
    },
    "premium97": {
      "p": 107.9,
      "r": 0
    }
  },
  "796": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "797": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "799": {
    "diesel": {
      "p": 127.3,
      "r": 0
    },
    "premiumDiesel": {
      "p": 130.3,
      "r": 0
    },
    "unleaded": {
      "p": 89.4,
      "r": 0
    },
    "premium95": {
      "p": 91.4,
      "r": 0
    },
    "premium97": {
      "p": 101.4,
      "r": 0
    }
  },
  "800": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "802": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "803": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "805": {
    "diesel": {
      "p": 131.7,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    },
    "premium97": {
      "p": 103,
      "r": 0
    }
  },
  "807": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "808": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "811": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "813": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    },
    "unleaded": {
      "p": 95.8,
      "r": 0
    }
  },
  "814": {
    "diesel": {
      "p": 128.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 89.9,
      "r": 0
    },
    "premium95": {
      "p": 91.9,
      "r": 0
    }
  },
  "817": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 96,
      "r": 0
    }
  },
  "818": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "824": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "825": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "826": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "827": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "828": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "831": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "832": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "835": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "838": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 145.45,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "839": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "841": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "843": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "844": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "845": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "847": {
    "diesel": {
      "p": 131.5,
      "r": 0
    },
    "premiumDiesel": {
      "p": 134.5,
      "r": 0
    },
    "unleaded": {
      "p": 95.3,
      "r": 0
    },
    "premium95": {
      "p": 97.3,
      "r": 0
    },
    "premium97": {
      "p": 104.1,
      "r": 0
    }
  },
  "851": {
    "diesel": {
      "p": 136.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 139.9,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "852": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "853": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "855": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 92.2,
      "r": 0
    },
    "premium95": {
      "p": 93.9,
      "r": 0
    }
  },
  "857": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 94.8,
      "r": 0
    }
  },
  "859": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "862": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 92.7,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "863": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "866": {
    "diesel": {
      "p": 134.3,
      "r": 1
    },
    "premiumDiesel": {
      "p": 144,
      "r": 1
    },
    "unleaded": {
      "p": 98.7,
      "r": 1
    },
    "premium95": {
      "p": 106.2,
      "r": 1
    }
  },
  "867": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "868": {
    "diesel": {
      "p": 132.7,
      "r": 0
    },
    "premiumDiesel": {
      "p": 135.7,
      "r": 0
    },
    "unleaded": {
      "p": 93.5,
      "r": 0
    },
    "premium95": {
      "p": 96,
      "r": 0
    }
  },
  "869": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "unleaded": {
      "p": 93.2,
      "r": 0
    },
    "premium95": {
      "p": 96.2,
      "r": 0
    }
  },
  "870": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "872": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "873": {
    "diesel": {
      "p": 127.3,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "874": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "875": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "876": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "877": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 95.9,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "878": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "880": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "882": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "883": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "884": {
    "diesel": {
      "p": 130.2,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.2,
      "r": 0
    },
    "unleaded": {
      "p": 94.2,
      "r": 0
    },
    "premium95": {
      "p": 96.2,
      "r": 0
    }
  },
  "885": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "886": {
    "diesel": {
      "p": 127.3,
      "r": 0
    },
    "premiumDiesel": {
      "p": 130.3,
      "r": 0
    },
    "unleaded": {
      "p": 88.8,
      "r": 0
    },
    "premium95": {
      "p": 90.8,
      "r": 0
    },
    "premium97": {
      "p": 100.8,
      "r": 0
    }
  },
  "888": {
    "diesel": {
      "p": 125.73,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 99.2,
      "r": 0
    },
    "premium95": {
      "p": 106.9,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "889": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "891": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "892": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "893": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "894": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "895": {
    "diesel": {
      "p": 131,
      "r": 0
    },
    "unleaded": {
      "p": 93.3,
      "r": 0
    },
    "premium95": {
      "p": 96.3,
      "r": 0
    }
  },
  "896": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "897": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "899": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    },
    "unleaded": {
      "p": 99.4,
      "r": 0
    }
  },
  "900": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 94.9,
      "r": 0
    },
    "premium95": {
      "p": 97.45,
      "r": 0
    }
  },
  "901": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "903": {
    "diesel": {
      "p": 140.2,
      "r": 0
    },
    "premiumDiesel": {
      "p": 142.9,
      "r": 0
    },
    "unleaded": {
      "p": 98.4,
      "r": 0
    },
    "premium95": {
      "p": 106.1,
      "r": 0
    },
    "premium97": {
      "p": 107.8,
      "r": 0
    }
  },
  "905": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "906": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "908": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "909": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 146.7,
      "r": 0
    },
    "unleaded": {
      "p": 99.4,
      "r": 0
    }
  },
  "911": {
    "diesel": {
      "p": 130.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "913": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "915": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 92.1,
      "r": 0
    },
    "premium95": {
      "p": 94.5,
      "r": 0
    }
  },
  "921": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "923": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "927": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "928": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "929": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "932": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "938": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "939": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "940": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "947": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "951": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 93.9,
      "r": 0
    }
  },
  "957": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "960": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "962": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 93,
      "r": 0
    },
    "premium95": {
      "p": 95,
      "r": 0
    }
  },
  "963": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 97.1,
      "r": 0
    }
  },
  "965": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "967": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "971": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "973": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "974": {
    "diesel": {
      "p": 124.3,
      "r": 0
    },
    "unleaded": {
      "p": 93.1,
      "r": 0
    },
    "premium95": {
      "p": 93.6,
      "r": 0
    }
  },
  "981": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "983": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "985": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 88.8,
      "r": 0
    },
    "premium95": {
      "p": 90.8,
      "r": 0
    }
  },
  "989": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "991": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 96.2,
      "r": 0
    }
  },
  "1001": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "1002": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    },
    "unleaded": {
      "p": 96.9,
      "r": 0
    }
  },
  "1003": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1009": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 89.6,
      "r": 0
    },
    "premium95": {
      "p": 91.6,
      "r": 0
    }
  },
  "1012": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "1015": {
    "diesel": {
      "p": 131.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 94,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    }
  },
  "1021": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1023": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "1027": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "1029": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 88.8,
      "r": 0
    },
    "premium95": {
      "p": 90.8,
      "r": 0
    }
  },
  "1032": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "1045": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1046": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1050": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1054": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1056": {
    "diesel": {
      "p": 136.2,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    },
    "unleaded": {
      "p": 96.3,
      "r": 0
    },
    "premium95": {
      "p": 105.3,
      "r": 0
    },
    "premium97": {
      "p": 108.3,
      "r": 0
    }
  },
  "1060": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "1062": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1063": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "1064": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "1065": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1069": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1070": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1071": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "1074": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1076": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "1078": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "1079": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 95.8,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "1083": {
    "diesel": {
      "p": 137.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 142.9,
      "r": 0
    },
    "unleaded": {
      "p": 99.4,
      "r": 0
    },
    "premium95": {
      "p": 106.1,
      "r": 0
    }
  },
  "1087": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1088": {
    "diesel": {
      "p": 133.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 136.1,
      "r": 0
    },
    "unleaded": {
      "p": 93.7,
      "r": 0
    },
    "premium95": {
      "p": 94.7,
      "r": 0
    }
  },
  "1089": {
    "diesel": {
      "p": 130.7,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.7,
      "r": 0
    },
    "unleaded": {
      "p": 93.8,
      "r": 0
    },
    "premium95": {
      "p": 95.8,
      "r": 0
    }
  },
  "1090": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "1091": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1096": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "1097": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "1098": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "1099": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1100": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1101": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1104": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1105": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1106": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1108": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "1113": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "1114": {
    "diesel": {
      "p": 131.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 103.3,
      "r": 0
    },
    "unleaded": {
      "p": 92.8,
      "r": 0
    },
    "premium95": {
      "p": 93.3,
      "r": 0
    }
  },
  "1115": {
    "diesel": {
      "p": 129.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133,
      "r": 0
    },
    "unleaded": {
      "p": 93.1,
      "r": 0
    },
    "premium95": {
      "p": 95.1,
      "r": 0
    },
    "premium97": {
      "p": 104.6,
      "r": 0
    }
  },
  "1116": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1122": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 100.9,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1123": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1124": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "1125": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1127": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1133": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "1134": {
    "diesel": {
      "p": 122.5,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 81,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "1136": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1141": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "1142": {
    "diesel": {
      "p": 130.5,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "1144": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1146": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "1148": {
    "diesel": {
      "p": 137.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 140.69,
      "r": 0
    },
    "unleaded": {
      "p": 95.95,
      "r": 0
    },
    "premium95": {
      "p": 100.94,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "1149": {
    "diesel": {
      "p": 131.7,
      "r": 0
    },
    "premiumDiesel": {
      "p": 140.7,
      "r": 0
    },
    "unleaded": {
      "p": 93.1,
      "r": 0
    },
    "premium95": {
      "p": 95.1,
      "r": 0
    }
  },
  "1152": {
    "diesel": {
      "p": 131.5,
      "r": 0
    },
    "premiumDiesel": {
      "p": 134.5,
      "r": 0
    },
    "unleaded": {
      "p": 93.7,
      "r": 0
    },
    "premium95": {
      "p": 95.7,
      "r": 0
    },
    "premium97": {
      "p": 108.6,
      "r": 0
    }
  },
  "1153": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1156": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "1158": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "1159": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1164": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1165": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "1169": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "1170": {
    "diesel": {
      "p": 130.3,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 95.2,
      "r": 0
    },
    "premium95": {
      "p": 97.2,
      "r": 0
    },
    "premium97": {
      "p": 105.8,
      "r": 0
    }
  },
  "1171": {
    "diesel": {
      "p": 130.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1172": {
    "diesel": {
      "p": 132.5,
      "r": 0
    },
    "premiumDiesel": {
      "p": 135.5,
      "r": 0
    },
    "unleaded": {
      "p": 94.2,
      "r": 0
    },
    "premium95": {
      "p": 96.3,
      "r": 0
    }
  },
  "1175": {
    "diesel": {
      "p": 131.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 134.8,
      "r": 0
    },
    "unleaded": {
      "p": 93.9,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 102.9,
      "r": 0
    }
  },
  "1177": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1179": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "1182": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "1184": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "1185": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "1187": {
    "diesel": {
      "p": 133.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 84,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 86.5,
      "r": 0
    }
  },
  "1188": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "1191": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "1192": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1193": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1194": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1195": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "1197": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1199": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "1202": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "1204": {
    "diesel": {
      "p": 132,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1205": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "1207": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "1208": {
    "diesel": {
      "p": 131.5,
      "r": 0
    },
    "premiumDiesel": {
      "p": 134.5,
      "r": 0
    },
    "unleaded": {
      "p": 89.6,
      "r": 0
    },
    "premium95": {
      "p": 91.6,
      "r": 0
    }
  },
  "1209": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1210": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1213": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "1214": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1215": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1219": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1220": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1224": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 91.9,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1226": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1229": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1230": {
    "diesel": {
      "p": 131.2,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 97,
      "r": 0
    },
    "premium97": {
      "p": 101.8,
      "r": 0
    }
  },
  "1231": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1234": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1241": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1243": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 89.1,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1244": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "1246": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "1253": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 93.5,
      "r": 0
    },
    "premium95": {
      "p": 96.9,
      "r": 0
    }
  },
  "1259": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1261": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1265": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1268": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1269": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "1273": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1281": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "1290": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1293": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1294": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "1296": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "1297": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "1303": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 99.64,
      "r": 0
    },
    "premium95": {
      "p": 103.55,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "1304": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "1307": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "1308": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "1310": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1311": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "1312": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "1313": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "1318": {
    "diesel": {
      "p": 138.5,
      "r": 0
    },
    "premiumDiesel": {
      "p": 147.9,
      "r": 0
    }
  },
  "1320": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    },
    "unleaded": {
      "p": 102.5,
      "r": 0
    }
  },
  "1321": {
    "diesel": {
      "p": 134.9,
      "r": 0
    }
  },
  "1322": {
    "diesel": {
      "p": 143.51,
      "r": 0
    },
    "premiumDiesel": {
      "p": 147.9,
      "r": 0
    },
    "unleaded": {
      "p": 98.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "1323": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1327": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1332": {
    "diesel": {
      "p": 140.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 98.25,
      "r": 0
    },
    "premium95": {
      "p": 100.9,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "1333": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "1334": {
    "diesel": {
      "p": 130.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1335": {
    "diesel": {
      "p": 131.2,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 94.9,
      "r": 0
    },
    "premium95": {
      "p": 97,
      "r": 0
    }
  },
  "1336": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "1340": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1341": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    },
    "unleaded": {
      "p": 98.4,
      "r": 0
    },
    "premium95": {
      "p": 108.4,
      "r": 0
    }
  },
  "1342": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "1343": {
    "diesel": {
      "p": 133.2,
      "r": 0
    },
    "unleaded": {
      "p": 94.9,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "1344": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "1346": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "1347": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1348": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1349": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1350": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1351": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "1352": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "1353": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1354": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "1355": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "1356": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "1357": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "1358": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1360": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 94.2,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1361": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133,
      "r": 0
    },
    "premium95": {
      "p": 94.8,
      "r": 0
    }
  },
  "1362": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "1363": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 92.9,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1364": {
    "diesel": {
      "p": 143.6,
      "r": 0
    },
    "premiumDiesel": {
      "p": 151.6,
      "r": 0
    },
    "unleaded": {
      "p": 94.65,
      "r": 0
    },
    "premium95": {
      "p": 102.25,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "1365": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1368": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "1369": {
    "diesel": {
      "p": 132.6,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.2,
      "r": 0
    },
    "premium95": {
      "p": 93.2,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "1370": {
    "diesel": {
      "p": 132,
      "r": 0
    },
    "premiumDiesel": {
      "p": 135,
      "r": 0
    },
    "unleaded": {
      "p": 94.9,
      "r": 0
    },
    "premium95": {
      "p": 96.9,
      "r": 0
    },
    "premium97": {
      "p": 107,
      "r": 0
    }
  },
  "1371": {
    "diesel": {
      "p": 133,
      "r": 0
    },
    "premiumDiesel": {
      "p": 136,
      "r": 0
    },
    "unleaded": {
      "p": 96.9,
      "r": 0
    },
    "premium95": {
      "p": 97.9,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "1372": {
    "diesel": {
      "p": 132.1,
      "r": 0
    },
    "unleaded": {
      "p": 95,
      "r": 0
    },
    "premium95": {
      "p": 98,
      "r": 0
    }
  },
  "1373": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "1374": {
    "diesel": {
      "p": 132,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "unleaded": {
      "p": 93.1,
      "r": 0
    },
    "premium95": {
      "p": 95.1,
      "r": 0
    }
  },
  "1375": {
    "diesel": {
      "p": 144.8,
      "r": 0
    },
    "unleaded": {
      "p": 104.1,
      "r": 0
    },
    "premium95": {
      "p": 111.8,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "1376": {
    "diesel": {
      "p": 131.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 133.79,
      "r": 0
    },
    "unleaded": {
      "p": 89,
      "r": 0
    },
    "premium95": {
      "p": 93.8,
      "r": 0
    },
    "premium97": {
      "p": 97.3,
      "r": 0
    }
  },
  "1377": {
    "diesel": {
      "p": 142.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    },
    "unleaded": {
      "p": 103.3,
      "r": 0
    },
    "premium95": {
      "p": 111,
      "r": 0
    },
    "premium97": {
      "p": 114,
      "r": 0
    }
  },
  "1378": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1379": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1380": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1381": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1382": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1383": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1384": {
    "diesel": {
      "p": 133.9,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.4,
      "r": 0
    },
    "unleaded": {
      "p": 94.35,
      "r": 0
    },
    "premium95": {
      "p": 102,
      "r": 0
    },
    "premium97": {
      "p": 105.5,
      "r": 0
    }
  },
  "1386": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  },
  "1387": {
    "diesel": {
      "p": 136.1,
      "r": 0
    },
    "premiumDiesel": {
      "p": 138.79,
      "r": 0
    },
    "unleaded": {
      "p": 91.1,
      "r": 0
    },
    "premium95": {
      "p": 95.9,
      "r": 0
    },
    "premium97": {
      "p": 99.4,
      "r": 0
    }
  },
  "1388": {
    "diesel": {
      "p": 129.4,
      "r": 0
    },
    "unleaded": {
      "p": 86,
      "r": 0
    },
    "premium95": {
      "p": 90.5,
      "r": 0
    },
    "premium97": {
      "p": 94.8,
      "r": 0
    }
  },
  "1389": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1391": {
    "diesel": {
      "p": 128.8,
      "r": 0
    },
    "premiumDiesel": {
      "p": 131.49,
      "r": 0
    },
    "premium95": {
      "p": 90.2,
      "r": 0
    }
  },
  "1397": {
    "diesel": {
      "p": 138.35,
      "r": 0
    },
    "premiumDiesel": {
      "p": 141.04,
      "r": 0
    }
  }
};

