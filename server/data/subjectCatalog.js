// server/data/subjectCatalog.js

const EXPECTED_YEARS = [2026, 2025, 2024, 2023];

const EXPECTED_EXAM_TYPES = ['Mid-Sem', 'End-Sem'];

const COMMON_SEM_1 = [
  {
    code: 'CS101',
    shortCode: 'FCP',
    name: 'Fundamentals of Computers & Programming',
    aliases: [
      'Fundamentals Of Computers & Programming',
      'Fundamentals of Computers and Programming',
      'FCP'
    ]
  },
  {
    code: 'EC102',
    shortCode: 'DD',
    name: 'Digital Design',
    aliases: ['Digital Design', 'DD']
  },
  {
    code: 'AS103',
    shortCode: 'EP',
    name: 'Engineering Physics',
    aliases: ['Engineering Physics', 'EP']
  },
  {
    code: 'AS104',
    shortCode: 'EM',
    name: 'Engineering Mathematics',
    aliases: ['Engineering Mathematics', 'EM']
  },
  {
    code: 'EC106',
    shortCode: 'ECA',
    name: 'Engineering Circuit Analysis',
    aliases: [
      'Engineering Circuit Analysis',
      'Electronic Circuit Analysis',
      'ECA'
    ]
  },
  {
    code: 'HM107',
    shortCode: 'IC',
    name: 'Indian Constitution',
    aliases: ['Indian Constitution', 'IC']
  }
];

const COMMON_SEM_2 = [
  {
    code: 'CS201',
    shortCode: 'DSA',
    name: 'Data Structure and Algorithm',
    aliases: [
      'Data Structure and Algorithm',
      'Data Structure and Algorithms',
      'Data Structures',
      'Data Structure & Algorithms',
      'DSA'
    ]
  },
  {
    code: 'EC202',
    shortCode: 'EDC',
    name: 'Electronic Devices and Circuits',
    aliases: [
      'Electronic Devices and Circuits',
      'Electronic Devices & Circuits',
      'EDC'
    ]
  },
  {
    code: 'CS203',
    shortCode: 'CAO',
    name: 'Computer Architecture & Organisation',
    aliases: [
      'Computer Architecture & Organisation',
      'Computer Architecture and Organisation',
      'Computer Architecture & Organization',
      'Computer Architecture and Organization',
      'CAO'
    ]
  },
  {
    code: 'AS204',
    shortCode: 'DM',
    name: 'Discrete Mathematics',
    aliases: ['Discrete Mathematics', 'DM']
  }
];

const SUBJECT_CATALOG = [
  // CSE Semester 1 and 2
  {
    branch: 'CSE',
    semester: 1,
    subjects: COMMON_SEM_1
  },
  {
    branch: 'CSE',
    semester: 2,
    subjects: COMMON_SEM_2
  },

  // ECE Semester 1 and 2
  {
    branch: 'ECE',
    semester: 1,
    subjects: COMMON_SEM_1
  },
  {
    branch: 'ECE',
    semester: 2,
    subjects: COMMON_SEM_2
  },

  // CSE Semester 3
  {
    branch: 'CSE',
    semester: 3,
    subjects: [
      {
        code: 'CS301',
        shortCode: 'OS',
        name: 'Operating System',
        aliases: ['Operating System', 'Operating Systems', 'OS']
      },
      {
        code: 'CS302',
        shortCode: 'DBMS',
        name: 'Database Management Systems',
        aliases: ['Database Management Systems', 'Database Management System', 'DBMS']
      },
      {
        code: 'CS303',
        shortCode: 'PPS',
        name: 'Programming for Problem Solving',
        aliases: ['Programming for Problem Solving', 'PPS']
      },
      {
        code: 'CS304',
        shortCode: 'AFL',
        name: 'Automata & Formal Languages',
        aliases: [
          'Automata & Formal Languages',
          'Automata and Formal Languages',
          'Automata Formal Language',
          'AFL'
        ]
      },
      {
        code: 'AS305',
        shortCode: 'PSA',
        name: 'Probability & Statistical Analysis',
        aliases: [
          'Probability & Statistical Analysis',
          'Probability and Statistical Analysis',
          'Probability Statistical Analysis',
          'PSA'
        ]
      },
      {
        code: 'HM306',
        shortCode: 'EBM',
        name: 'Economics & Business Management',
        aliases: [
          'Economics & Business Management',
          'Economics and Business Management',
          'EBM'
        ]
      }
    ]
  },

  // CSE Semester 4
  {
    branch: 'CSE',
    semester: 4,
    subjects: [
      {
        code: 'CS401',
        shortCode: 'SE',
        name: 'Software Engineering',
        aliases: ['Software Engineering', 'SE']
      },
      {
        code: 'CS402',
        shortCode: 'CN',
        name: 'Computer Networks',
        aliases: ['Computer Networks', 'Computer Network', 'CN']
      },
      {
        code: 'CS403',
        shortCode: 'SS',
        name: 'System Software',
        aliases: ['System Software', 'SS']
      },
      {
        code: 'CS404',
        shortCode: 'OOT',
        name: 'Object Oriented Technology',
        aliases: [
          'Object Oriented Technology',
          'Object-Oriented Technology',
          'Object Oriented Programming',
          'OOP',
          'OOT'
        ]
      },
      {
        code: 'CS405',
        shortCode: 'DAA',
        name: 'Design Analysis and Algorithm',
        aliases: [
          'Design Analysis and Algorithm',
          'Design Analysis & Algorithm',
          'Design and Analysis of Algorithm',
          'DAA'
        ]
      },
      {
        code: 'EC407',
        shortCode: 'ADC',
        name: 'Analog & Digital Communication',
        aliases: [
          'Analog & Digital Communication',
          'Analog and Digital Communication',
          'ADC'
        ]
      }
    ]
  },

  // CSE Semester 5
  {
    branch: 'CSE',
    semester: 5,
    subjects: [
      {
        code: 'CS501',
        shortCode: 'DS',
        name: 'Data Science',
        aliases: ['Data Science', 'DS']
      },
      {
        code: 'CS502',
        shortCode: 'CG',
        name: 'Computer Graphics',
        aliases: ['Computer Graphics', 'CG']
      },
      {
        code: 'CS503',
        shortCode: 'HPC',
        name: 'High Performance Computing',
        aliases: ['High Performance Computing', 'HPC']
      },
      {
        code: 'CS504',
        shortCode: 'CCBD',
        name: 'Cloud Computing & Big Data Infrastructure',
        aliases: [
          'Cloud Computing & Big Data Infrastructure',
          'Cloud Computing and Big Data Infrastructure',
          'Cloud Computing',
          'Big Data Infrastructure',
          'CCBD'
        ]
      },
      {
        code: 'HM505',
        shortCode: 'IE',
        name: 'Innovation & Entrepreneurship',
        aliases: [
          'Innovation & Entrepreneurship',
          'Innovation and Entrepreneurship',
          'IE'
        ]
      }
    ]
  },

  // CSE Semester 6
  {
    branch: 'CSE',
    semester: 6,
    subjects: [
      {
        code: 'CS601',
        shortCode: 'ML',
        name: 'Machine Learning',
        aliases: ['Machine Learning', 'ML']
      },
      {
        code: 'CS602',
        shortCode: 'IS',
        name: 'Information Security',
        aliases: ['Information Security', 'IS']
      },
      {
        code: 'CS603',
        shortCode: 'WE',
        name: 'Web Engineering',
        aliases: ['Web Engineering', 'WE']
      }
    ]
  },

  // CSE Semester 7
  {
    branch: 'CSE',
    semester: 7,
    subjects: [
      {
        code: 'CS701',
        shortCode: 'AI',
        name: 'Artificial Intelligence',
        aliases: ['Artificial Intelligence', 'AI']
      },
      {
        code: 'CS702',
        shortCode: 'NLP',
        name: 'Natural Language Processing',
        aliases: ['Natural Language Processing', 'NLP']
      }
    ]
  },

  // ECE Semester 3
  {
    branch: 'ECE',
    semester: 3,
    subjects: [
      {
        code: 'CS301',
        shortCode: 'OS',
        name: 'Operating System',
        aliases: ['Operating System', 'Operating Systems', 'OS']
      },
      {
        code: 'EC302',
        shortCode: 'EN',
        name: 'Electrical Networks',
        aliases: ['Electrical Networks', 'Electrical Network', 'EN']
      },
      {
        code: 'EC303',
        shortCode: 'EC',
        name: 'Electronic Circuits',
        aliases: ['Electronic Circuits', 'Electronic Circuit', 'EC']
      },
      {
        code: 'EC304',
        shortCode: 'SS',
        name: 'Signals & Systems',
        aliases: ['Signals & Systems', 'Signals and Systems', 'SS']
      },
      {
        code: 'AS305',
        shortCode: 'PSA',
        name: 'Probability & Statistical Analysis',
        aliases: [
          'Probability & Statistical Analysis',
          'Probability and Statistical Analysis',
          'Probability Statistical Analysis',
          'PSA'
        ]
      },
      {
        code: 'HM306',
        shortCode: 'EBM',
        name: 'Economics & Business Management',
        aliases: [
          'Economics & Business Management',
          'Economics and Business Management',
          'EBM'
        ]
      }
    ]
  },

  // ECE Semester 4
  {
    branch: 'ECE',
    semester: 4,
    subjects: [
      {
        code: 'EC401',
        shortCode: 'CS',
        name: 'Control Systems',
        aliases: ['Control Systems', 'Control System']
      },
      {
        code: 'CS402',
        shortCode: 'CN',
        name: 'Computer Networks',
        aliases: ['Computer Networks', 'Computer Network', 'CN']
      },
      {
        code: 'EC403',
        shortCode: 'AC',
        name: 'Analog Circuits',
        aliases: ['Analog Circuits', 'Analog Circuit', 'AC']
      },
      {
        code: 'EC404',
        shortCode: 'COMMS',
        name: 'Communication Systems',
        aliases: ['Communication Systems', 'Communication System']
      },
      {
        code: 'EC405',
        shortCode: 'ES',
        name: 'Embedded Systems',
        aliases: ['Embedded Systems', 'Embedded System', 'ES']
      },
      {
        code: 'EC406',
        shortCode: 'EM',
        name: 'Electromagnetics',
        aliases: ['Electromagnetics', 'Electromagnetic', 'EM']
      }
    ]
  },

  // ECE Semester 5
  {
    branch: 'ECE',
    semester: 5,
    subjects: [
      {
        code: 'EC501',
        shortCode: 'WC',
        name: 'Wireless Communication',
        aliases: ['Wireless Communication', 'WC']
      },
      {
        code: 'EC502',
        shortCode: 'NDE',
        name: 'Nanoscale Device Engineering',
        aliases: ['Nanoscale Device Engineering', 'NDE']
      },
      {
        code: 'EC503',
        shortCode: 'IPCV',
        name: 'Image Processing & Computer Vision',
        aliases: [
          'Image Processing & Computer Vision',
          'Image Processing and Computer Vision',
          'IPCV'
        ]
      },
      {
        code: 'CS504',
        shortCode: 'CCBD',
        name: 'Cloud Computing & Big Data Infrastructure',
        aliases: [
          'Cloud Computing & Big Data Infrastructure',
          'Cloud Computing and Big Data Infrastructure',
          'Cloud Computing',
          'Big Data Infrastructure',
          'CCBD'
        ]
      },
      {
        code: 'HM505',
        shortCode: 'IE',
        name: 'Innovation & Entrepreneurship',
        aliases: [
          'Innovation & Entrepreneurship',
          'Innovation and Entrepreneurship',
          'IE'
        ]
      }
    ]
  },

  // ECE Semester 6
  {
    branch: 'ECE',
    semester: 6,
    subjects: [
      {
        code: 'CS601',
        shortCode: 'ML',
        name: 'Machine Learning',
        aliases: ['Machine Learning', 'ML']
      },
      {
        code: 'EC602',
        shortCode: 'DVLSI',
        name: 'Digital VLSI Design',
        aliases: ['Digital VLSI Design', 'VLSI Design', 'DVLSI']
      },
      {
        code: 'CS603',
        shortCode: 'WE',
        name: 'Web Engineering',
        aliases: ['Web Engineering', 'WE']
      }
    ]
  },

  // ECE Semester 7
  {
    branch: 'ECE',
    semester: 7,
    subjects: [
      {
        code: 'CS701',
        shortCode: 'AI',
        name: 'Artificial Intelligence',
        aliases: ['Artificial Intelligence', 'AI']
      },
      {
        code: 'EC702',
        shortCode: 'EVT',
        name: 'Electric Vehicle Technology',
        aliases: ['Electric Vehicle Technology', 'EVT']
      }
    ]
  }
];

module.exports = {
  SUBJECT_CATALOG,
  EXPECTED_YEARS,
  EXPECTED_EXAM_TYPES
};