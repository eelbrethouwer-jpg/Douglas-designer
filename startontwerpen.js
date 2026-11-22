// Eigen bewerkbare startontwerpen. Alle afmetingen zijn in millimeters.
globalThis.DouglasStartontwerpen = [
  {
    "version": 1,
    "id": "item-mwryscbn-za7p6h",
    "name": "Dubbele kamado met centrale werkplek – indelingsstudie",
    "width": 2800,
    "depth": 900,
    "height": 950,
    "section": 50,
    "sectionLong": 100,
    "stockLength": 2800,
    "kerf": 3,
    "beamPrice": 16.95,
    "countertop": true,
    "countertopSpec": {
      "thickness": 24,
      "overhangSide": 8,
      "overhangFront": 14,
      "overhangBack": 14
    },
    "frameEdits": {},
    "materials": {
      "screwsPerJoint": 2,
      "screwBox": 200,
      "wastePct": 10,
      "hingesPerDoorModule": 4,
      "drawerSetsPerModule": 2,
      "oilCoverage": 10,
      "oilCoats": 2,
      "prices": {}
    },
    "modules": [
      {
        "id": "item-mwryscbn-4l2yy1",
        "kind": "kamado",
        "width": 800,
        "name": "Kamado links"
      },
      {
        "id": "item-mwryscbn-2oua4w",
        "kind": "drawers",
        "width": 1000,
        "name": "Werkplek en laden"
      },
      {
        "id": "item-mwryscbn-1t9h1o",
        "kind": "kamado",
        "width": 800,
        "name": "Kamado rechts"
      }
    ],
    "beams": [],
    "reference": {
      "notes": "Eigen concept met voorbeeldmaten. Toestelmaten, dekseluitslag, uitsparing, ondersteuning en vrije afstanden per kamado volgens fabrikant vastleggen vóór uitvoering.",
      "photos": []
    }
  },
  {
    "version": 1,
    "id": "item-mwryscbp-zwf4nf",
    "name": "Vrijstaande overkapping – lessenaar",
    "width": 4000,
    "depth": 3000,
    "height": 2668,
    "section": 50,
    "sectionLong": 100,
    "stockLength": 6000,
    "kerf": 3,
    "beamPrice": 16.95,
    "countertop": false,
    "countertopSpec": {
      "thickness": 24,
      "overhangSide": 8,
      "overhangFront": 14,
      "overhangBack": 14
    },
    "frameEdits": {},
    "materials": {
      "screwsPerJoint": 2,
      "screwBox": 200,
      "wastePct": 10,
      "hingesPerDoorModule": 4,
      "drawerSetsPerModule": 2,
      "oilCoverage": 10,
      "oilCoats": 2,
      "prices": {}
    },
    "modules": [],
    "beams": [
      {
        "id": "item-mwryscbp-rbougl",
        "name": "Staander Vrijstaande overkapping – lessenaar",
        "x": 0,
        "y": 0,
        "z": 0,
        "axis": "y",
        "length": 2200,
        "profile": "100x100"
      },
      {
        "id": "item-mwryscbp-5fl42p",
        "name": "Staander Vrijstaande overkapping – lessenaar",
        "x": 0,
        "y": 0,
        "z": 2900,
        "axis": "y",
        "length": 2350,
        "profile": "100x100"
      },
      {
        "id": "item-mwryscbp-gwwcrm",
        "name": "Staander Vrijstaande overkapping – lessenaar",
        "x": 3900,
        "y": 0,
        "z": 0,
        "axis": "y",
        "length": 2200,
        "profile": "100x100"
      },
      {
        "id": "item-mwryscbp-n57awt",
        "name": "Staander Vrijstaande overkapping – lessenaar",
        "x": 3900,
        "y": 0,
        "z": 2900,
        "axis": "y",
        "length": 2350,
        "profile": "100x100"
      },
      {
        "id": "item-mwryscbp-i5apte",
        "name": "Bovenligger Vrijstaande overkapping – lessenaar",
        "x": 50,
        "y": 2200,
        "z": 25,
        "axis": "x",
        "length": 3900,
        "profile": "50x150"
      },
      {
        "id": "item-mwryscbp-l29f3z",
        "name": "Bovenligger Vrijstaande overkapping – lessenaar",
        "x": 50,
        "y": 2350,
        "z": 2925,
        "axis": "x",
        "length": 3900,
        "profile": "50x150"
      }
    ],
    "plan": {
      "zones": [
        {
          "id": "z1",
          "name": "Vrijstaande overkapping – lessenaar",
          "kind": "open",
          "x": 0,
          "z": 0,
          "w": 4000,
          "d": 3000,
          "h": 2500,
          "walls": "",
          "door": null,
          "roof": {
            "kind": "lessenaar",
            "high": "n",
            "low": 2350
          }
        }
      ],
      "lines": []
    },
    "reference": {
      "notes": "Eigen indelingsstudie. Profielen komen uit de standaardgenerator. Overspanningen, stabiliteit, houtverbindingen, dakbelasting en fundering zijn niet doorgerekend.",
      "photos": []
    },
    "panels": [
      {
        "id": "item-mwryscbp-m9n0oq",
        "name": "Dakspar Vrijstaande overkapping – lessenaar",
        "kind": "rafter",
        "slope": {
          "axis": "z",
          "y2": 2500,
          "h2": 150
        },
        "x": 25,
        "y": 2350,
        "z": 0,
        "w": 50,
        "h": 150,
        "d": 3000,
        "color": "#b8824f"
      },
      {
        "id": "item-mwryscbp-uvd7og",
        "name": "Dakspar Vrijstaande overkapping – lessenaar",
        "kind": "rafter",
        "slope": {
          "axis": "z",
          "y2": 2500,
          "h2": 150
        },
        "x": 580,
        "y": 2350,
        "z": 0,
        "w": 50,
        "h": 150,
        "d": 3000,
        "color": "#b8824f"
      },
      {
        "id": "item-mwryscbp-a92aa4",
        "name": "Dakspar Vrijstaande overkapping – lessenaar",
        "kind": "rafter",
        "slope": {
          "axis": "z",
          "y2": 2500,
          "h2": 150
        },
        "x": 1140,
        "y": 2350,
        "z": 0,
        "w": 50,
        "h": 150,
        "d": 3000,
        "color": "#b8824f"
      },
      {
        "id": "item-mwryscbp-x2f2yo",
        "name": "Dakspar Vrijstaande overkapping – lessenaar",
        "kind": "rafter",
        "slope": {
          "axis": "z",
          "y2": 2500,
          "h2": 150
        },
        "x": 1695,
        "y": 2350,
        "z": 0,
        "w": 50,
        "h": 150,
        "d": 3000,
        "color": "#b8824f"
      },
      {
        "id": "item-mwryscbp-lws689",
        "name": "Dakspar Vrijstaande overkapping – lessenaar",
        "kind": "rafter",
        "slope": {
          "axis": "z",
          "y2": 2500,
          "h2": 150
        },
        "x": 2255,
        "y": 2350,
        "z": 0,
        "w": 50,
        "h": 150,
        "d": 3000,
        "color": "#b8824f"
      },
      {
        "id": "item-mwryscbp-zeqhfc",
        "name": "Dakspar Vrijstaande overkapping – lessenaar",
        "kind": "rafter",
        "slope": {
          "axis": "z",
          "y2": 2500,
          "h2": 150
        },
        "x": 2810,
        "y": 2350,
        "z": 0,
        "w": 50,
        "h": 150,
        "d": 3000,
        "color": "#b8824f"
      },
      {
        "id": "item-mwryscbp-y2ldv0",
        "name": "Dakspar Vrijstaande overkapping – lessenaar",
        "kind": "rafter",
        "slope": {
          "axis": "z",
          "y2": 2500,
          "h2": 150
        },
        "x": 3370,
        "y": 2350,
        "z": 0,
        "w": 50,
        "h": 150,
        "d": 3000,
        "color": "#b8824f"
      },
      {
        "id": "item-mwryscbp-j0lxf9",
        "name": "Dakspar Vrijstaande overkapping – lessenaar",
        "kind": "rafter",
        "slope": {
          "axis": "z",
          "y2": 2500,
          "h2": 150
        },
        "x": 3925,
        "y": 2350,
        "z": 0,
        "w": 50,
        "h": 150,
        "d": 3000,
        "color": "#b8824f"
      },
      {
        "id": "item-mwryscbp-2jxeur",
        "name": "Dakplaat Vrijstaande overkapping – lessenaar",
        "kind": "roof",
        "slope": {
          "axis": "z",
          "y2": 2650,
          "h2": 18
        },
        "x": 0,
        "y": 2500,
        "z": 0,
        "w": 4000,
        "h": 18,
        "d": 3000,
        "color": "#7b858b"
      }
    ]
  },
  {
    "version": 1,
    "id": "item-mwryscbq-gyabvg",
    "name": "Open pergola – terras",
    "width": 3000,
    "depth": 3000,
    "height": 2500,
    "section": 50,
    "sectionLong": 100,
    "stockLength": 6000,
    "kerf": 3,
    "beamPrice": 16.95,
    "countertop": false,
    "countertopSpec": {
      "thickness": 24,
      "overhangSide": 8,
      "overhangFront": 14,
      "overhangBack": 14
    },
    "frameEdits": {},
    "materials": {
      "screwsPerJoint": 2,
      "screwBox": 200,
      "wastePct": 10,
      "hingesPerDoorModule": 4,
      "drawerSetsPerModule": 2,
      "oilCoverage": 10,
      "oilCoats": 2,
      "prices": {}
    },
    "modules": [],
    "beams": [
      {
        "id": "item-mwryscbp-necge8",
        "name": "Staander Open pergola – terras",
        "x": 0,
        "y": 0,
        "z": 0,
        "axis": "y",
        "length": 2350,
        "profile": "100x100"
      },
      {
        "id": "item-mwryscbp-xhbf4k",
        "name": "Staander Open pergola – terras",
        "x": 0,
        "y": 0,
        "z": 2900,
        "axis": "y",
        "length": 2350,
        "profile": "100x100"
      },
      {
        "id": "item-mwryscbp-4zrogh",
        "name": "Staander Open pergola – terras",
        "x": 2900,
        "y": 0,
        "z": 0,
        "axis": "y",
        "length": 2350,
        "profile": "100x100"
      },
      {
        "id": "item-mwryscbp-0pn48l",
        "name": "Staander Open pergola – terras",
        "x": 2900,
        "y": 0,
        "z": 2900,
        "axis": "y",
        "length": 2350,
        "profile": "100x100"
      },
      {
        "id": "item-mwryscbp-gbhn7r",
        "name": "Bovenligger Open pergola – terras",
        "x": 50,
        "y": 2350,
        "z": 25,
        "axis": "x",
        "length": 2900,
        "profile": "50x150"
      },
      {
        "id": "item-mwryscbp-yc7lb3",
        "name": "Bovenligger Open pergola – terras",
        "x": 50,
        "y": 2350,
        "z": 2925,
        "axis": "x",
        "length": 2900,
        "profile": "50x150"
      },
      {
        "id": "item-mwryscbp-pvdp9o",
        "name": "Bovenligger Open pergola – terras",
        "x": 25,
        "y": 2350,
        "z": 75,
        "axis": "z",
        "length": 2850,
        "profile": "50x150"
      },
      {
        "id": "item-mwryscbp-9sq0e0",
        "name": "Bovenligger Open pergola – terras",
        "x": 2925,
        "y": 2350,
        "z": 75,
        "axis": "z",
        "length": 2850,
        "profile": "50x150"
      },
      {
        "id": "item-mwryscbp-w9z1wp",
        "name": "Dwarslat Open pergola – terras",
        "x": 605,
        "y": 2450,
        "z": 75,
        "axis": "z",
        "length": 2850,
        "profile": "50x50"
      },
      {
        "id": "item-mwryscbp-im86pv",
        "name": "Dwarslat Open pergola – terras",
        "x": 1185,
        "y": 2450,
        "z": 75,
        "axis": "z",
        "length": 2850,
        "profile": "50x50"
      },
      {
        "id": "item-mwryscbp-u9auls",
        "name": "Dwarslat Open pergola – terras",
        "x": 1765,
        "y": 2450,
        "z": 75,
        "axis": "z",
        "length": 2850,
        "profile": "50x50"
      },
      {
        "id": "item-mwryscbq-opl0bs",
        "name": "Dwarslat Open pergola – terras",
        "x": 2345,
        "y": 2450,
        "z": 75,
        "axis": "z",
        "length": 2850,
        "profile": "50x50"
      }
    ],
    "plan": {
      "zones": [
        {
          "id": "z1",
          "name": "Open pergola – terras",
          "kind": "pergola",
          "x": 0,
          "z": 0,
          "w": 3000,
          "d": 3000,
          "h": 2500,
          "walls": "",
          "door": null
        }
      ],
      "lines": []
    },
    "reference": {
      "notes": "Eigen indelingsstudie. Profielen komen uit de standaardgenerator. Overspanningen, stabiliteit, houtverbindingen, dakbelasting en fundering zijn niet doorgerekend.",
      "photos": []
    }
  }
];
