export type Lang = 'en' | 'gu' | 'hi'

export const LANG_META: Record<Lang, { label: string; nativeName: string }> = {
  en: { label: 'EN', nativeName: 'English' },
  gu: { label: 'GU', nativeName: 'ગુજરાતી' },
  hi: { label: 'HI', nativeName: 'हिन्दी' },
}

export const dictionary: Record<string, Record<Lang, string>> = {
  // App Meta
  'app.title': { en: 'Rasoi Vibhag', gu: 'રસોઈ વિભાગ', hi: 'रसोई विभाग' },
  'app.subtitle': { en: 'Management System', gu: 'મેનેજમેન્ટ સિસ્ટમ', hi: 'प्रबंधन प्रणाली' },

  // Login & Errors
  'login.title': { en: 'Rasoi Login', gu: 'રસોઈ લોગિન', hi: 'रसोई लॉगिन' },
  'login.username': { en: 'Username', gu: 'યુઝરનેમ', hi: 'उपयोगकर्ता नाम' },
  'login.password': { en: 'Password', gu: 'પાસવર્ડ', hi: 'पासवर्ड' },
  'login.signIn': { en: 'Sign In', gu: 'સાઇન ઇન', hi: 'साइन इन' },
  'login.signingIn': { en: 'Signing In...', gu: 'સાઇન ઇન થઈ રહ્યું છે...', hi: 'साइन इन हो रहा है...' },
  'error.connection': { en: 'Connection failed', gu: 'કનેક્શન નિષ્ફળ', hi: 'कनेक्शन विफल' },

  // Common
  'common.save': { en: 'Save', gu: 'સાચવો', hi: 'सहेजें' },
  'common.cancel': { en: 'Cancel', gu: 'રદ કરો', hi: 'रद्द करें' },
  'common.edit': { en: 'Edit', gu: 'ફેરફાર કરો', hi: 'संपादित करें' },
  'common.delete': { en: 'Delete', gu: 'કાઢી નાખો', hi: 'हटाएं' },

  // Navigation / Layout
  'nav.section.daily': { en: 'Daily Tasks', gu: 'દૈનિક કાર્યો', hi: 'दैनिक कार्य' },
  'nav.section.admin': { en: 'Administration', gu: 'વહીવટ', hi: 'प्रशासन' },
  'nav.todaysMeal': { en: 'Today’s Meal', gu: 'આજનું ભોજન', hi: 'आज का भोजन' },
  'nav.transactionEntry': { en: 'Transaction Entry', gu: 'વ્યવહાર એન્ટ્રી', hi: 'लेनदेन प्रविष्टि' },
  'nav.pendingAmounts': { en: 'Pending Amounts', gu: 'બાકી રકમ', hi: 'लंबित राशि' },
  'nav.myEntries': { en: 'My Entries', gu: 'મારી એન્ટ્રીઓ', hi: 'मेरी प्रविष्टियां' },
  'nav.allTransactions': { en: 'All Transactions', gu: 'બધા વ્યવહારો', hi: 'सभी लेनदेन' },
  'nav.bhojanshalaCounts': { en: 'Bhojanshala Counts', gu: 'ભોજનશાળા સંખ્યા', hi: 'भोजनशाला गणना' },
  'nav.attendance': { en: 'Attendance', gu: 'હાજરી', hi: 'उपस्थिति' },
  'nav.salary': { en: 'Salary', gu: 'પગાર', hi: 'वेतन' },
  'nav.menuPlanner': { en: 'Menu Planner', gu: 'મેનુ પ્લાનર', hi: 'मेनू योजनाकार' },
  'nav.rasoiSeva': { en: 'Rasoi Seva', gu: 'રસોઈ સેવા', hi: 'रसोई सेवा' },
  'nav.masters': { en: 'Masters', gu: 'માસ્ટર', hi: 'मास्टर' },
  'nav.userManagement': { en: 'User Management', gu: 'યુઝર મેનેજમેન્ટ', hi: 'उपयोगकर्ता प्रबंधन' },
  'nav.reports': { en: 'Reports', gu: 'રિપોર્ટ', hi: 'रिपोर्ट' },

  // Pages Descriptions
  'todaysMeal.description': { en: 'Today’s planned menu and sponsored seva for your bhojanshalas', gu: 'તમારી ભોજનશાળાઓ માટે આજનું આયોજિત મેનુ અને પ્રાયોજિત સેવા', hi: 'आपकी भोजनशालाओं के लिए आज का नियोजित मेनू और प्रायोजित सेवा' },
  'todaysMeal.noSeva': { en: 'No seva booked today.', gu: 'આજે કોઈ સેવા બુક થઈ નથી.', hi: 'आज कोई सेवा बुक नहीं की गई है।' },
  'todaysMeal.notSet': { en: 'Not set.', gu: 'નક્કી નથી.', hi: 'तय नहीं।' },

  'transaction.description': { en: 'Record purchases and consumption', gu: 'ખરીદી અને વપરાશ નોંધો', hi: 'खरीद और खपत रिकॉर्ड करें' },
  'transaction.add': { en: 'Add transaction', gu: 'વ્યવહાર ઉમેરો', hi: 'लेनदेन जोड़ें' },
  'transaction.recent': { en: 'Recent transactions', gu: 'તાજેતરના વ્યવહારો', hi: 'हाल के लेनदेन' },

  'pending.description': { en: 'Transactions missing purchase amounts', gu: 'જે વ્યવહારોમાં ખરીદ રકમ બાકી છે', hi: 'लेनदेन जिनमें खरीद राशि लंबित है' },
  
  'myEntries.description': { en: 'Transactions you entered today', gu: 'આજે તમે દાખલ કરેલા વ્યવહારો', hi: 'आज आपके द्वारा दर्ज किए गए लेनदेन' },
  
  'allTransactions.description': { en: 'Complete ledger — admin view', gu: 'સંપૂર્ણ ખાતાવહી — એડમિન વ્યુ', hi: 'संपूर्ण बहीखाता — व्यवस्थापक दृश्य' },

  'counts.description': { en: 'Headcount tracking per meal', gu: 'દરેક ટાણા મુજબ સંખ્યાની નોંધ', hi: 'प्रत्येक भोजन के अनुसार सिर की गिनती' },
  
  'attendance.description': { en: 'Mark daily attendance for each staff member', gu: 'દરેક સ્ટાફ મેમ્બરની દૈનિક હાજરી નોંધો', hi: 'प्रत्येक कर्मचारी की दैनिक उपस्थिति दर्ज करें' },
  
  'salary.description': { en: 'Attendance-based: Net = Days Present × Per-Day Rate', gu: 'હાજરી આધારિત: નેટ = હાજર દિવસો × પ્રતિ-દિવસ દર', hi: 'उपस्थिति आधारित: शुद्ध = उपस्थित दिन × प्रति दिन दर' },

  'menu.description': { en: 'One menu per bhojanshala per meal, per day', gu: 'દરેક ભોજનશાળા માટે પ્રતિ દિવસ પ્રતિ ટાણું એક મેનુ', hi: 'प्रति भोजनशाला प्रति भोजन प्रति दिन एक मेनू' },
  'menu.readOnlyInfo': { en: 'View only — today’s menu for your bhojanshala. Menus are set by the admin.', gu: 'માત્ર જોવા માટે — તમારી ભોજનશાળા માટે આજનું મેનુ. મેનુ એડમિન દ્વારા સેટ કરવામાં આવે છે.', hi: 'केवल देखने के लिए — आपकी भोजनशाला के लिए आज का मेनू। मेनू व्यवस्थापक द्वारा सेट किए जाते हैं।' },

  'seva.description': { en: 'Donor-sponsored meals — count per slot', gu: 'દાતા-પ્રાયોજિત ભોજન — સ્લોટ દીઠ સંખ્યા', hi: 'दाता-प्रायोजित भोजन — प्रति स्लॉट गिनती' },
  'seva.readOnlyInfo': { en: 'View only — today’s seva for your bhojanshala. Seva is booked by the admin.', gu: 'માત્ર જોવા માટે — તમારી ભોજનશાળા માટે આજની સેવા. સેવા એડમિન દ્વારા બુક કરવામાં આવે છે.', hi: 'केवल देखने के लिए — आपकी भोजनशाला के लिए आज की सेवा। सेवा व्यवस्थापक द्वारा बुक की जाती है।' },

  // Labels
  'today.parivar': { en: 'Parivar', gu: 'પરિવાર', hi: 'परिवार' },
  'today.total': { en: 'Total', gu: 'કુલ', hi: 'कुल' },
  'today.noBhojanshala': { en: 'No Bhojanshala Assigned', gu: 'કોઈ ભોજનશાળા સોંપેલ નથી', hi: 'कोई भोजनशाला नहीं' },
  'today.cookFor': { en: 'Cook For', gu: 'રસોઈ બનાવો', hi: 'के लिए खाना बनाएं' },
  'today.served': { en: 'Served', gu: 'પીરસ્યું', hi: 'परोसा गया' },
  'today.menu': { en: 'Menu', gu: 'મેનુ', hi: 'मेनू' },
  'today.noMenu': { en: 'No menu set.', gu: 'કોઈ મેનુ નક્કી નથી.', hi: 'कोई मेनू सेट नहीं है।' },
  'today.sevaBy': { en: 'Seva By', gu: 'સેવા કરનાર', hi: 'सेवा द्वारा' },
  'today.noSeva': { en: 'No seva booked.', gu: 'કોઈ સેવા બુક થઈ નથી.', hi: 'कोई सेवा बुक नहीं हुई।' },
  'today.setMenu': { en: 'Set Menu', gu: 'મેનુ સેટ કરો', hi: 'मेनू सेट करें' },
  'today.enterCounts': { en: 'Enter Counts', gu: 'સંખ્યા દાખલ કરો', hi: 'गिनती दर्ज करें' },

  // Notice
  'notice.prototype': { en: 'Prototype Mode: Data is saved only locally in your browser.', gu: 'પ્રોટોટાઈપ મોડ: ડેટા ફક્ત તમારા બ્રાઉઝરમાં સાચવવામાં આવે છે.', hi: 'प्रोटोटाइप मोड: डेटा केवल आपके ब्राउज़र में सहेजा जाता है।' },
}
