/** Practice prompts, deliberately separate from recognition capability.
 * Consult the selected language's qualified teachers; these words are not motions. */
export const practiceGroups: Record<string,string[]> = {
  'Alphabet': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  'Numbers': Array.from({length:21},(_,i)=>String(i)),
  'Conversation': ['Hello','Goodbye','Please','Thank you','Sorry','Excuse me','Yes','No','Maybe','Again','Slow','Understand','Do not understand','Name','Meet','Welcome','Help','Wait','Ready','Finished'],
  'Everyday needs': ['Water','Food','Eat','Drink','Hungry','Thirsty','Bathroom','Sleep','Tired','Hot','Cold','Home','Work','School','Stop','Go','Come','Sit','Stand','More','Enough','Want','Need','Where','When','Who','What','Why','How'],
  'People & family': ['Mother','Father','Parent','Child','Baby','Sister','Brother','Friend','Family','Teacher','Student','Doctor','Nurse','Interpreter','Person','People','Deaf','Hearing','Partner','Neighbor'],
  'Health & comfort': ['Pain','Sick','Medicine','Hospital','Emergency','Okay','Better','Hurt','Rest','Breathe','Dizzy','Allergy','Appointment','Mask','Care','Comfort'],
  'Time & plans': ['Today','Tomorrow','Yesterday','Morning','Afternoon','Evening','Night','Now','Later','Soon','Minute','Hour','Day','Week','Month','Year','Before','After','Start','End'],
  'Places & travel': ['Here','There','Left','Right','Near','Far','Car','Bus','Train','Walk','Airport','Store','Office','Library','Park','Door','Inside','Outside','Up','Down'],
  'Feelings': ['Happy','Sad','Angry','Afraid','Excited','Calm','Love','Like','Dislike','Worried','Confused','Proud','Surprised','Bored','Feel'],
  'Things & colors': ['Phone','Computer','Book','Pen','Paper','Table','Chair','Bag','Key','Money','Red','Blue','Green','Yellow','Black','White','Orange','Purple','Brown','Pink'],
};
export const practiceCatalog=Object.entries(practiceGroups).flatMap(([category,words])=>words.map(word=>({word,category,id:`${category}:${word}`})));
