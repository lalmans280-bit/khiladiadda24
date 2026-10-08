(() => {
  const translations = {
    '👤 My profile': ['👤 मेरी प्रोफ़ाइल', '👤 My profile'],
    '🏆 Win cash': ['🏆 पैसे जीतें', '🏆 Win cash'],
    '👛 My wallet': ['👛 मेरा वॉलेट', '👛 My wallet'],
    '📜 History': ['📜 इतिहास', '📜 History'],
    '🎁 Refer and earn': ['🎁 रेफ़र करें और कमाएं', '🎁 Refer and earn'],
    '🔔 Notification': ['🔔 सूचनाएं', '🔔 Notifications'],
    '🛟 Support': ['🛟 सहायता', '🛟 Support'],
    '📄 All policies': ['📄 सभी नीतियां', '📄 All policies'],
    '🚪 Logout': ['🚪 लॉग आउट', '🚪 Logout'],
    'Home': ['होम', 'Home'],
    'Games': ['गेम्स', 'Games'],
    'Wallet': ['वॉलेट', 'Wallet'],
    'Profile': ['प्रोफ़ाइल', 'Profile'],
    'Refresh': ['रीफ़्रेश करें', 'Refresh'],
    'Open battles': ['ओपन बैटल', 'Open battles'],
    'OPEN Battles': ['ओपन बैटल', 'Open battles'],
    'Running Battles': ['चल रहे बैटल', 'RUNNING BATTLES'],
    'My running battles': ['मेरे चल रहे बैटल', 'MY RUNNING BATTLES'],
    'Demo Battles': ['डेमो बैटल', 'Demo Battles'],
    'SAMPLE PLAYERS': ['नमूना खिलाड़ी', 'SAMPLE PLAYERS'],
    'DEMO': ['डेमो', 'DEMO'],
    'Sample players only · Not live matches; cannot join.': ['केवल नमूना खिलाड़ी · असली मैच नहीं हैं और इनमें शामिल नहीं हो सकते।', 'Sample players only · Not live matches; cannot join.'],
    'Account history': ['खाते का इतिहास', 'Account history'],
    'Minimum ₹100. Multiples of ₹50.': ['न्यूनतम ₹100। ₹50 के गुणकों में राशि चुनें।', 'Minimum ₹100. Choose amounts in multiples of ₹50.'],
    'Game': ['गेम', 'Game'],
    'Ludo Classic': ['लूडो क्लासिक', 'Ludo Classic'],
    'Popular Ludo': ['पॉपुलर लूडो', 'Popular Ludo'],
    'Snake': ['स्नेक', 'Snake'],
    'Snake Battle': ['स्नेक बैटल', 'Snake Battle'],
    'Entry amount (₹)': ['एंट्री राशि (₹)', 'Entry amount (₹)'],
    'e.g. 250': ['जैसे 250', 'e.g. 250'],
    'Set challenge': ['चैलेंज सेट करें', 'Set challenge'],
    'Challenger, entry amount aur winning amount dekhein.': ['चैलेंजर, एंट्री राशि और जीतने की राशि देखें।', 'View the challenger, entry amount, and winning amount.'],
    'Available balance': ['उपलब्ध बैलेंस', 'Available balance'],
    'Aadhaar KYC': ['आधार KYC', 'Aadhaar KYC'],
    'Loading': ['लोड हो रहा है', 'Loading'],
    'Withdraw ke liye KYC approval zaroori hai.': ['पैसे निकालने के लिए KYC की मंज़ूरी ज़रूरी है।', 'KYC approval is required to withdraw.'],
    'Wallet deposit': ['वॉलेट में जमा करें', 'Wallet deposit'],
    'Minimum ₹100. QR se payment ke baad UTR aur screenshot bhejein; admin approval par amount credit hoga.': ['न्यूनतम ₹100। QR से भुगतान के बाद UTR और स्क्रीनशॉट भेजें; एडमिन की मंज़ूरी के बाद राशि जमा होगी।', 'Minimum ₹100. After paying by QR, submit the UTR and screenshot. The amount is credited after admin approval.'],
    'Deposit amount (₹)': ['जमा राशि (₹)', 'Deposit amount (₹)'],
    'UPI QR banayein': ['UPI QR बनाएं', 'Generate UPI QR'],
    'UTR / reference number': ['UTR / संदर्भ नंबर', 'UTR / reference number'],
    'Payment screenshot': ['भुगतान का स्क्रीनशॉट', 'Payment screenshot'],
    'Deposit request bhejein': ['जमा अनुरोध भेजें', 'Submit deposit request'],
    'Withdraw': ['पैसे निकालें', 'Withdraw'],
    'Minimum ₹500. Aadhaar KYC approve hone ke baad hi request bhej sakte hain.': ['न्यूनतम ₹500। आधार KYC मंज़ूर होने के बाद ही अनुरोध भेज सकते हैं।', 'Minimum ₹500. You can request a withdrawal after Aadhaar KYC is approved.'],
    'Amount (₹)': ['राशि (₹)', 'Amount (₹)'],
    'Aapka UPI ID': ['आपकी UPI ID', 'Your UPI ID'],
    'Withdrawal request bhejein': ['निकासी अनुरोध भेजें', 'Submit withdrawal request'],
    'Aadhaar number aur card image admin verification ke liye upload karein. OTP ya PIN kabhi share na karein.': ['एडमिन जांच के लिए आधार नंबर और कार्ड की तस्वीर अपलोड करें। OTP या PIN कभी साझा न करें।', 'Upload your Aadhaar number and card image for admin verification. Never share your OTP or PIN.'],
    'Aadhaar number': ['आधार नंबर', 'Aadhaar number'],
    'Player profile': ['खिलाड़ी की प्रोफ़ाइल', 'Player profile'],
    'Player name': ['खिलाड़ी का नाम', 'Player name'],
    'Profile image': ['प्रोफ़ाइल तस्वीर', 'Profile image'],
    'Profile save karein': ['प्रोफ़ाइल सेव करें', 'Save profile'],
    'Account details': ['खाते की जानकारी', 'Account details'],
    'Mobile:': ['मोबाइल:', 'Mobile:'],
    'Balance:': ['बैलेंस:', 'Balance:'],
    'Your referral ID:': ['आपकी रेफ़रल ID:', 'Your referral ID:'],
    '📋 Referral ID copy karein': ['📋 रेफ़रल ID कॉपी करें', '📋 Copy referral ID'],
    'Game, deposit aur withdrawal ki latest activity.': ['गेम, जमा और निकासी की हाल की गतिविधियां।', 'Recent game, deposit, and withdrawal activity.'],
    '← Battles par wapas': ['← बैटल पर वापस जाएं', '← Back to battles'],
    '← Games': ['← गेम्स','← Games'],
    'Logout': ['लॉग आउट','Logout'],
    'Aadhaar card image': ['आधार कार्ड की तस्वीर','Aadhaar card image'],
    'KYC review ke liye bhejein': ['KYC समीक्षा के लिए भेजें','Submit for KYC review'],
    'Install App': ['ऐप इंस्टॉल करें', 'Install app'],
    'Share': ['शेयर करें', 'Share'],
    'KhiladiAdda24 mobile app': ['KhiladiAdda24 मोबाइल ऐप', 'KhiladiAdda24 mobile app'],
    'PLAY': ['खेलें', 'PLAY'],
    'BATTLE': ['बैटल', 'BATTLE'],
    'WIN': ['जीतें', 'WIN'],
    'OPEN 24/7 WITHDRAW': ['24/7 निकासी उपलब्ध', 'Withdraw 24/7'],
    'LIVE': ['लाइव', 'LIVE'],
    'Creator': ['चैलेंज बनाने वाला', 'Creator'],
    'Challenger': ['चैलेंजर', 'Challenger'],
    'Opponent': ['प्रतिद्वंद्वी', 'Opponent'],
    'Result review': ['नतीजे की समीक्षा', 'Result review'],
    'Cancel review': ['रद्द करने की समीक्षा', 'Cancellation review'],
    'Pending': ['लंबित', 'Pending'],
    'In review': ['समीक्षा में', 'In review'],
    'Verified': ['सत्यापित', 'Verified'],
    'Rejected': ['अस्वीकृत', 'Rejected'],
    'Approved': ['मंज़ूर', 'Approved'],
    'Paid': ['भुगतान हो गया', 'Paid'],
    'Waiting for player': ['खिलाड़ी का इंतज़ार', 'Waiting for player'],
    'In progress': ['जारी है', 'In progress'],
    'Result under review': ['नतीजे की समीक्षा जारी है', 'Result under review'],
    'Cancellation review': ['रद्द करने की समीक्षा', 'Cancellation review'],
    'Completed': ['पूरा हुआ', 'Completed'],
    'Cancelled': ['रद्द किया गया', 'Cancelled'],
    'Deposit': ['जमा', 'Deposit'],
    'Withdrawal': ['निकासी', 'Withdrawal'],
    'Credited': ['जमा किया गया', 'Credited'],
    'Won': ['जीते', 'Won'],
    'Lost': ['हारे', 'Lost'],
    'Entry': ['एंट्री', 'Entry'],
    'Time unavailable': ['समय उपलब्ध नहीं', 'Time unavailable'],
    'Total deposited · approved': ['कुल जमा · मंज़ूर', 'Total deposited · approved'],
    'Withdrawals · paid': ['निकासी · भुगतान हो गया', 'Withdrawals · paid'],
    'Withdrawals · pending': ['निकासी · लंबित', 'Withdrawals · pending'],
    'Winning amount credited': ['जीत की राशि जमा हुई', 'Winning amount credited'],
    'Hisab load ho raha hai...': ['खाते का विवरण लोड हो रहा है...', 'Loading account summary...'],
    'Updated': ['अपडेट किया गया', 'Updated'],
    'Details': ['विवरण', 'Details'],
    'Cancel': ['रद्द करें', 'Cancel'],
    'Copy': ['कॉपी करें', 'Copy'],
    'Locked': ['लॉक है', 'Locked'],
    'Start room code setup': ['रूम कोड सेटअप शुरू करें', 'Start room code setup'],
    'ROOM CODE SHARE': ['रूम कोड साझा करें', 'Share room code'],
    'START': ['शुरू करें', 'Start'],
    'Result / screenshot': ['नतीजा / स्क्रीनशॉट', 'Result / screenshot'],
    'Open Ludo King App': ['लूडो किंग ऐप खोलें', 'Open Ludo King app'],
    'Open Ludo King': ['लूडो किंग खोलें', 'Open Ludo King'],
    'Game Rules': ['गेम के नियम', 'Game rules'],
    'Close game rules': ['गेम के नियम बंद करें', 'Close game rules'],
    'Room code': ['रूम कोड', 'Room code'],
    'LOCKED': ['लॉक है', 'LOCKED'],
    'Ludo King se mila room code': ['लूडो किंग से मिला रूम कोड', 'Room code from Ludo King'],
    'Yahan code enter karein': ['यहां कोड डालें', 'Enter code here'],
    '4-8 digit room code': ['4-8 अंकों का रूम कोड', '4-8 digit room code'],
    'Winner': ['विजेता', 'Winner'],
    'Win screenshot file (both players)': ['जीत का स्क्रीनशॉट (दोनों खिलाड़ियों के लिए)', 'Winning screenshot (for both players)'],
    'I Lost - LOSS': ['मैं हार गया - हार की रिपोर्ट', 'I lost - report loss'],
    'I Lost - LOSS report bhejein': ['मैं हार गया - हार की रिपोर्ट भेजें', 'I lost - submit loss report'],
    'Loss reason': ['हार का कारण', 'Loss reason'],
    'Loss ka reason likhein': ['हार का कारण लिखें', 'Enter the reason for the loss'],
    'Abhi koi file select nahi hai.': ['अभी कोई फ़ाइल नहीं चुनी गई है।', 'No file selected yet.'],
    'Dono players apne match ka screenshot upload karein. WIN report ke liye required hai. JPG, PNG ya WebP; maximum 5 MB.': ['दोनों खिलाड़ी अपने मैच का स्क्रीनशॉट अपलोड करें। जीत की रिपोर्ट के लिए यह ज़रूरी है। JPG, PNG या WebP; अधिकतम 5 MB।', 'Both players must upload a match screenshot. Required for a win report. JPG, PNG, or WebP; maximum 5 MB.'],
    'Room code lock ho gaya hai. Game ke baad Result review karein ya I Lost chunein.': ['रूम कोड लॉक हो गया है। गेम के बाद नतीजे की समीक्षा करें या हार की रिपोर्ट चुनें।', 'The room code is locked. After the game, review the result or report a loss.'],
    'Abhi koi active battle nahi hai.': ['अभी कोई सक्रिय बैटल नहीं है।', 'There are no active battles yet.'],
    '₹500 minimum; ₹100 ke steps mein (₹500, ₹600, ₹700...). Withdraw ke liye approved KYC zaroori hai.': ['न्यूनतम ₹500; ₹100 के चरणों में (₹500, ₹600, ₹700...)। निकासी के लिए KYC मंज़ूर होना ज़रूरी है।', '₹500 minimum; in ₹100 steps (₹500, ₹600, ₹700...). Approved KYC is required to withdraw.'],
    'Minimum entry ₹100 aur wallet balance mein poori entry honi chahiye. Ludo Classic Ludo King app mein khelein; host room code share karega.': ['न्यूनतम एंट्री ₹100 है और वॉलेट में पूरी एंट्री राशि होनी चाहिए। लूडो क्लासिक लूडो किंग ऐप में खेलें; होस्ट रूम कोड साझा करेगा।', 'Minimum entry is ₹100 and your wallet must cover it. Play Ludo Classic in the Ludo King app; the host will share the room code.'],
    'Withdrawal method': ['निकासी का तरीका', 'Withdrawal method'],
    'Bank account': ['बैंक खाता', 'Bank account'],
    'UPI ID': ['UPI ID', 'UPI ID'],
    'Account holder name': ['खाताधारक का नाम', 'Account holder name'],
    'Bank account number': ['बैंक खाता नंबर', 'Bank account number'],
    'Bank IFSC code': ['बैंक IFSC कोड', 'Bank IFSC code'],
    'UPI QR image': ['UPI QR की तस्वीर', 'UPI QR image'],
    'JPG, PNG ya WebP; maximum 5 MB.': ['JPG, PNG या WebP; अधिकतम 5 MB।', 'JPG, PNG, or WebP; maximum 5 MB.'],
    'Only game winnings are withdrawable.': ['केवल गेम में जीती गई राशि निकाली जा सकती है।', 'Only game winnings are withdrawable.'],
    'Withdrawal ₹500 se shuru hoti hai aur ₹100 ke steps mein request karein.': ['निकासी ₹500 से शुरू होती है; ₹100 के चरणों में अनुरोध करें।', 'Withdrawals start at ₹500; request in ₹100 steps.'],
    'Withdrawal request submit nahi hui.': ['निकासी अनुरोध जमा नहीं हुआ।', 'Withdrawal request could not be submitted.'],
    'Deposit · Show QR': ['जमा करें · QR दिखाएं', 'Deposit · Show QR'],
    'Deposit payment': ['जमा भुगतान', 'Deposit payment'],
    'UPI deposit QR code': ['UPI जमा QR कोड', 'UPI deposit QR code'],
    'Open UPI app': ['UPI ऐप खोलें', 'Open UPI app'],
    'Download QR': ['QR डाउनलोड करें', 'Download QR'],
    'Continue to deposit request': ['जमा अनुरोध जारी रखें', 'Continue to deposit request'],
    'UPI app na khule to QR download karke kisi aur device se scan karein.': ['अगर UPI ऐप न खुले, तो QR डाउनलोड करके किसी दूसरे डिवाइस से स्कैन करें।', 'If the UPI app does not open, download the QR and scan it with another device.'],
    'Exact amount: ₹': ['सटीक राशि: ₹', 'Exact amount: ₹'],
    'Abhi koi history nahi hai.': ['अभी कोई इतिहास नहीं है।', 'There is no history yet.'],
    'Game chal raha hai': ['गेम चल रहा है', 'Game in progress'],
    'LIVE · Game chal raha hai': ['लाइव · गेम चल रहा है', 'LIVE · Game in progress'],
    'Room code locked · Ludo King mein kheliye': ['रूम कोड लॉक · लूडो किंग में खेलें', 'Room code locked · play in Ludo King'],
    'Opponent joined · room code pending': ['प्रतिद्वंद्वी जुड़ गया · रूम कोड बाकी है', 'Opponent joined · room code pending'],
    'Opponent join karte hi match automatically start hoga.': ['प्रतिद्वंद्वी के जुड़ते ही मैच अपने-आप शुरू होगा।', 'The match starts automatically when an opponent joins.'],
    'Battle creator room code share karega.': ['बैटल बनाने वाला खिलाड़ी रूम कोड साझा करेगा।', 'The battle creator will share the room code.'],
    'Sirf creator START dabakar Ludo King room setup karega. Room code share hone tak wait karein.': ['केवल बैटल बनाने वाला खिलाड़ी START दबाकर लूडो किंग रूम सेटअप करेगा। रूम कोड साझा होने तक इंतज़ार करें।', 'Only the battle creator can press START to set up the Ludo King room. Wait for the room code to be shared.'],
    'Opponent join hone ke baad creator room code setup karke share karega. Code lock hone par dono players use copy karke Ludo King mein khelenge.': ['प्रतिद्वंद्वी के जुड़ने के बाद बैटल बनाने वाला खिलाड़ी रूम कोड सेट करके साझा करेगा। कोड लॉक होने पर दोनों खिलाड़ी उसे कॉपी करके लूडो किंग में खेलेंगे।', 'After the opponent joins, the creator will set up and share the room code. Once locked, both players can copy it and play in Ludo King.'],
    'Cancel request admin review mein hai. Approval ke baad hi match cancel aur refund hoga.': ['रद्द करने का अनुरोध एडमिन की समीक्षा में है। मंज़ूरी के बाद ही मैच रद्द होगा और राशि वापस मिलेगी।', 'The cancellation request is under admin review. The match will be cancelled and refunded only after approval.'],
    'Code:': ['कोड:', 'Code:'],
    'Entry ₹': ['एंट्री ₹', 'Entry ₹'],
    'My money summary': ['मेरे पैसों का सारांश', 'My money summary'],
    'Withdrawable game winnings:': ['निकालने योग्य गेम जीत की राशि:', 'Withdrawable game winnings:'],
    'Deposits and bonuses cannot be withdrawn.': ['जमा राशि और बोनस नहीं निकाले जा सकते।', 'Deposits and bonuses cannot be withdrawn.'],
    'Pehle valid entry amount par SET dabayein.': ['पहले सही एंट्री राशि के लिए SET दबाएं।', 'Press SET for a valid entry amount first.'],
    '₹100 se ₹50,000 ke beech ₹50 ke multiples mein amount dalein.': ['₹100 से ₹50,000 के बीच ₹50 के गुणकों में राशि डालें।', 'Enter an amount from ₹100 to ₹50,000 in multiples of ₹50.'],
    'Deposit minimum ₹100 hai.': ['जमा राशि कम से कम ₹100 होनी चाहिए।', 'Minimum deposit is ₹100.'],
    'Withdrawal minimum ₹500 hai.': ['निकासी राशि कम से कम ₹500 होनी चाहिए।', 'Minimum withdrawal is ₹500.'],
    '12 digit Aadhaar number dalein.': ['12 अंकों का आधार नंबर डालें।', 'Enter your 12-digit Aadhaar number.'],
    '4-8 digit room code enter karein.': ['4-8 अंकों का रूम कोड डालें।', 'Enter a 4-8 digit room code.'],
    'Room code copy ho gaya.': ['रूम कोड कॉपी हो गया।', 'Room code copied.'],
    'Room code share ho gaya.': ['रूम कोड साझा हो गया।', 'Room code shared.'],
    'Referral ID copy ho gayi.': ['रेफ़रल ID कॉपी हो गई।', 'Referral ID copied.'],
    'Referral ID abhi load nahi hui.': ['रेफ़रल ID अभी लोड नहीं हुई है।', 'Referral ID has not loaded yet.'],
    'Abhi koi nayi notification nahi hai.': ['अभी कोई नई सूचना नहीं है।', 'There are no new notifications.'],
    'Kuch problem hui.': ['कुछ समस्या हुई।', 'Something went wrong.'],
    'Session expire hua. Dobara login karein.': ['सेशन समाप्त हो गया। दोबारा लॉगिन करें।', 'Your session expired. Please log in again.'],
    'Request complete nahi hui.': ['अनुरोध पूरा नहीं हुआ।', 'The request could not be completed.'],
    'Payment options ready hain.': ['भुगतान के विकल्प तैयार हैं।', 'Payment options are ready.'],
    'UPI app se pay karein ya QR download karke scan karein. Balance approval ke baad credit hoga.': ['UPI ऐप से भुगतान करें या QR डाउनलोड करके स्कैन करें। मंज़ूरी के बाद बैलेंस जमा होगा।', 'Pay with a UPI app or download and scan the QR. The balance will be credited after approval.'],
    'Website share karein': ['वेबसाइट साझा करें', 'Share website'],
    'Website link copy ho gaya. Ab share karein.': ['वेबसाइट लिंक कॉपी हो गया। अब इसे साझा करें।', 'Website link copied. You can now share it.'],
    'Aapki Referral ID:': ['आपकी रेफ़रल ID:', 'Your referral ID:'],
    'UPI payment QR': ['UPI भुगतान QR', 'UPI payment QR'],
    'Selected win screenshot preview': ['चुने गए जीत के स्क्रीनशॉट का पूर्वावलोकन', 'Selected winning screenshot preview'],
    'Language selector': ['भाषा चुनें', 'Choose language'],
    'Aapka ': ['आपका ', 'Your '],
    ' entry ke liye balance kam hai. ': ' एंट्री के लिए बैलेंस कम है। ',
    ' deposit karein.': ' जमा करें।',
    'Battle join nahi ho saki.': ['बैटल में शामिल नहीं हो सके।', 'Could not join the battle.'],
    'Cancel reason select karein.': ['रद्द करने का कारण चुनें।', 'Choose a cancellation reason.'],
    'Cancel reason list se number select karein.': ['रद्द करने के कारणों की सूची से नंबर चुनें।', 'Choose a number from the cancellation reason list.'],
    'Galat room code': ['गलत रूम कोड', 'Incorrect room code'],
    'Opponent respond nahi kar raha': ['प्रतिद्वंद्वी जवाब नहीं दे रहा', 'Opponent is not responding'],
    'Technical issue': ['तकनीकी समस्या', 'Technical issue'],
    'Other': ['अन्य','Other'],
    'Player reported LOSS': ['खिलाड़ी ने हार की रिपोर्ट दी', 'Player reported a loss'],
    'Status:': ['स्थिति:', 'Status:'],
    ' entry ka Open Battle ban raha hai...': [' एंट्री का ओपन बैटल बनाया जा रहा है...', ' entry open battle is being created...'],
    'Aapka LOSS confirm ho gaya. Opponent WIN hua aur payout automatic ho gaya.': ['आपकी हार की पुष्टि हो गई। प्रतिद्वंद्वी जीत गया और भुगतान अपने-आप हो गया।', 'Your loss was confirmed. The opponent won and the payout was processed automatically.'],
    'Dono players ke result match nahi hue. Admin decision ka wait karein.': ['दोनों खिलाड़ियों के नतीजे मेल नहीं खाते। एडमिन के फैसले का इंतज़ार करें।', 'The players reported different results. Wait for the admin decision.'],
    'Aapka LOSS report submit ho gaya. Opponent ka payout automatically update hoga.': ['आपकी हार की रिपोर्ट भेज दी गई है। प्रतिद्वंद्वी का भुगतान अपने-आप अपडेट होगा।', 'Your loss report was submitted. The opponent payout will update automatically.'],
    ' report submit ho chuka hai. Dusre player ki report aur admin approval ke baad winner ka wallet automatic update hoga.': [' की रिपोर्ट जमा हो गई है। दूसरे खिलाड़ी की रिपोर्ट और एडमिन की मंज़ूरी के बाद विजेता का वॉलेट अपने-आप अपडेट होगा।', ' report submitted. The winner wallet updates automatically after the other player reports and admin approves.'],
    'LOSS report bheji ja rahi hai...': ['हार की रिपोर्ट भेजी जा रही है...','Submitting loss report...'],
    'LOSS report submit nahi hui.': ['हार की रिपोर्ट जमा नहीं हुई।', 'The loss report could not be submitted.'],
    'Room code ka 2-minute timer shuru karne ke liye START dabayein.': ['2 मिनट का रूम कोड टाइमर शुरू करने के लिए START दबाएं।', 'Press START to begin the 2-minute room code timer.'],
    'Room setup start nahi hui.': ['रूम सेटअप शुरू नहीं हुआ।', 'Room setup did not start.'],
    'Game ke baad result submit karein.': ['गेम के बाद नतीजा जमा करें।', 'Submit the result after the game.'],
    'KhiladiAdda24 app pehle se installed hai.': ['KhiladiAdda24 ऐप पहले से इंस्टॉल है।', 'KhiladiAdda24 is already installed.'],
    'App install ke liye website HTTPS par khuli honi chahiye.': ['ऐप इंस्टॉल करने के लिए वेबसाइट HTTPS पर खुली होनी चाहिए।', 'The website must be open over HTTPS to install the app.'],
    'Safari ke Share button par tap karke “Add to Home Screen” chunein.': ['Safari के Share बटन पर टैप करके “होम स्क्रीन पर जोड़ें” चुनें।', 'Tap Share in Safari and choose “Add to Home Screen”.'],
    'Chrome ke menu (⋮) se “Install app” ya “Add to Home screen” chunein.': ['Chrome मेन्यू (⋮) से “ऐप इंस्टॉल करें” या “होम स्क्रीन पर जोड़ें” चुनें।', 'From the Chrome menu (⋮), choose “Install app” or “Add to Home screen”.'],
    'Cancel reason chunein:': ['रद्द करने का कारण चुनें:','Choose a cancellation reason:'],
    'Room code share ho chuka hai. Cancel reason admin ko bhejein? Approval ke baad hi cancel aur refund hoga.': ['रूम कोड साझा हो चुका है। क्या रद्द करने का कारण एडमिन को भेजें? मंज़ूरी के बाद ही रद्द होगा और राशि वापस मिलेगी।', 'The room code has been shared. Send a cancellation reason to the admin? Cancellation and refund require approval.'],
    'Room code share hone se pehle game cancel karke entry refund karein?': ['रूम कोड साझा होने से पहले गेम रद्द करके एंट्री राशि वापस करें?','Cancel the game and refund the entry before the room code is shared?'],
    'Aadhaar KYC approve hone ke baad hi withdrawal kar sakte hain.': ['आधार KYC मंज़ूर होने के बाद ही पैसे निकाल सकते हैं।','Withdrawals are available only after Aadhaar KYC is approved.'],
    'Aadhaar KYC verified. Withdrawal request bhej sakte hain.': ['आधार KYC सत्यापित है। निकासी अनुरोध भेज सकते हैं।','Aadhaar KYC is verified. You can request a withdrawal.'],
    'Withdrawal nahi bhej sakte: pehle Aadhaar KYC submit karein.': ['निकासी नहीं कर सकते: पहले आधार KYC जमा करें।','Withdrawal unavailable: submit Aadhaar KYC first.'],
    'Withdrawal abhi nahi bhej sakte: Aadhaar KYC admin review mein hai.': ['अभी निकासी नहीं कर सकते: आधार KYC एडमिन की समीक्षा में है।','Withdrawal unavailable: Aadhaar KYC is under admin review.'],
    'Withdrawal nahi bhej sakte: Aadhaar KYC reject hua.': ['निकासी नहीं कर सकते: आधार KYC अस्वीकृत हुआ।','Withdrawal unavailable: Aadhaar KYC was rejected.'],
    'OPEN': ['खुला','OPEN'],
    'RUNNING': ['जारी','RUNNING'],
    'PENDING_RESULT': ['नतीजे की समीक्षा','Result under review'],
    'PENDING_CANCELLATION': ['रद्द करने की समीक्षा','Cancellation review'],
    'COMPLETED': ['पूरा हुआ','Completed'],
    'CANCELLED': ['रद्द किया गया','Cancelled'],
    ' battle · ': [' बैटल · ',' battle · '],
    'ROOM CODE LOCKED': ['रूम कोड लॉक है','ROOM CODE LOCKED'],
    'OPPONENT JOINED · ROOM CODE PENDING': ['प्रतिद्वंद्वी जुड़ गया · रूम कोड बाकी है','OPPONENT JOINED · ROOM CODE PENDING'],
    'Login - KhiladiAdda24.com': ['लॉगिन - KhiladiAdda24.com','Login - KhiladiAdda24.com'],
    'Support - KhiladiAdda24': ['सहायता - KhiladiAdda24','Support - KhiladiAdda24'],
    'Policies - KhiladiAdda24': ['नीतियां - KhiladiAdda24','Policies - KhiladiAdda24'],
    'Add Money - KhiladiAdda24.com': ['पैसे जमा करें - KhiladiAdda24.com','Add Money - KhiladiAdda24.com'],
    'KhiladiAdda24.com Admin Panel': ['KhiladiAdda24.com एडमिन पैनल','KhiladiAdda24.com Admin Panel'],
    'PLAY & WIN REAL CASH': ['खेलें और असली पैसे जीतें','PLAY & WIN REAL CASH'],
    'Player': ['खिलाड़ी','Player'],
    'Admin': ['एडमिन','Admin'],
    'Welcome back': ['वापसी पर स्वागत है','Welcome back'],
    'Mobile number': ['मोबाइल नंबर','Mobile number'],
    '10 digit mobile number': ['10 अंकों का मोबाइल नंबर','10-digit mobile number'],
    'Referral ID (optional)': ['रेफ़रल ID (वैकल्पिक)','Referral ID (optional)'],
    '8 character referral ID': ['8 अक्षरों की रेफ़रल ID','8-character referral ID'],
    'Login with OTP': ['OTP से लॉगिन करें','Login with OTP'],
    '100% Safe & Secure Platform': ['100% सुरक्षित प्लेटफ़ॉर्म','100% Safe & Secure Platform'],
    '6-digit OTP': ['6 अंकों का OTP','6-digit OTP'],
    'SMS mein mila OTP': ['SMS में मिला OTP','OTP received by SMS'],
    'Login / Play': ['लॉगिन / खेलें','Login / Play'],
    'OTP dobara bhejein': ['OTP दोबारा भेजें','Resend OTP'],
    'Mobile number badlein': ['मोबाइल नंबर बदलें','Change mobile number'],
    'Admin panel mein login karein': ['एडमिन पैनल में लॉगिन करें','Log in to admin panel'],
    'Verify OTP': ['OTP सत्यापित करें','Verify OTP'],
    'Admin panel ke liye allowlisted mobile number se login karein.': ['एडमिन पैनल के लिए अनुमति प्राप्त मोबाइल नंबर से लॉगिन करें।','Log in with an allowlisted mobile number to access the admin panel.'],
    'OTP bhejein (': ['OTP भेजें (','Send OTP ('],
    'Naya OTP ': ['नया OTP ','New OTP '],
    ' baad bhej sakte hain.': ' बाद भेज सकते हैं।',
    'Naya OTP bhejne ke liye taiyar.': ['नया OTP भेजने के लिए तैयार।','Ready to send a new OTP.'],
    'Request complete nahi hui. Dobara try karein.': ['अनुरोध पूरा नहीं हुआ। दोबारा कोशिश करें।','The request could not be completed. Please try again.'],
    'Internet connection check karein aur dobara try karein.': ['इंटरनेट कनेक्शन जांचें और दोबारा कोशिश करें।','Check your internet connection and try again.'],
    'Kuch problem hui. Dobara try karein.': ['कुछ समस्या हुई। दोबारा कोशिश करें।','Something went wrong. Please try again.'],
    'Valid 10 digit Indian mobile number dalein.': ['सही 10 अंकों का भारतीय मोबाइल नंबर डालें।','Enter a valid 10-digit Indian mobile number.'],
    'Referral ID 8 characters ki dalein.': ['8 अक्षरों की रेफ़रल ID डालें।','Enter an 8-character referral ID.'],
    'OTP bheja ja raha hai...': ['OTP भेजा जा रहा है...','Sending OTP...'],
    'Test OTP upar diya gaya hai.': ['टेस्ट OTP ऊपर दिया गया है।','The test OTP is shown above.'],
    ' par bheja 6-digit OTP dalein.': ' पर भेजा गया 6 अंकों का OTP डालें।',
    'SMS mein aaye OTP ko yahan dalein.': ['SMS में आया OTP यहां डालें।','Enter the OTP received by SMS here.'],
    'Valid OTP dalein.': ['सही OTP डालें।','Enter a valid OTP.'],
    'Verify ho raha hai...': ['सत्यापन हो रहा है...','Verifying...'],
    'OTP verify ho raha hai...': ['OTP सत्यापित हो रहा है...','Verifying OTP...'],
    'Need Help?': ['मदद चाहिए?','Need help?'],
    'For login issues, deposit queries, withdrawal help, game disputes, and wallet support, contact us anytime.': ['लॉगिन, जमा, निकासी, गेम विवाद या वॉलेट सहायता के लिए कभी भी हमसे संपर्क करें।','For login issues, deposits, withdrawals, game disputes, or wallet support, contact us anytime.'],
    'We resolve urgent matters within working time and update users through wallet notifications and support messages.': ['हम जरूरी मामलों को कार्य समय में सुलझाते हैं और वॉलेट सूचनाओं व सहायता संदेशों से अपडेट देते हैं।','We resolve urgent matters during working hours and update users through wallet notifications and support messages.'],
    'Support Number:': ['सहायता नंबर:','Support number:'],
    'WhatsApp:': ['व्हाट्सऐप:','WhatsApp:'],
    'Support: 24/7 Available': ['सहायता: 24/7 उपलब्ध','Support: available 24/7'],
    'Back to App': ['ऐप पर वापस जाएं','Back to app'],
    'KhiladiAdda24 Support': ['KhiladiAdda24 सहायता','KhiladiAdda24 support'],
    'WhatsApp and Support': ['व्हाट्सऐप और सहायता','WhatsApp and support'],
    'KhiladiAdda24 Policies': ['KhiladiAdda24 नीतियां','KhiladiAdda24 policies'],
    'Back to Home': ['होम पर वापस जाएं','Back to home'],
    'Privacy Policy': ['गोपनीयता नीति','Privacy policy'],
    'We respect user privacy. Personal information such as mobile number, wallet amount, and transaction details are used only for service operation, KYC support, and payment verification.': ['हम उपयोगकर्ताओं की गोपनीयता का सम्मान करते हैं। मोबाइल नंबर, वॉलेट राशि और लेन-देन की जानकारी का उपयोग केवल सेवा, KYC सहायता और भुगतान सत्यापन के लिए होता है।','We respect user privacy. Personal information such as mobile number, wallet amount, and transaction details are used only for service operation, KYC support, and payment verification.'],
    'We do not sell user data to third parties. Information may be stored securely for legal, fraud prevention, and dispute resolution purposes.': ['हम उपयोगकर्ता की जानकारी तीसरे पक्ष को नहीं बेचते। कानूनी जरूरतों, धोखाधड़ी रोकने और विवाद सुलझाने के लिए जानकारी सुरक्षित रखी जा सकती है।','We do not sell user data to third parties. Information may be stored securely for legal, fraud prevention, and dispute resolution purposes.'],
    'Terms & Conditions': ['नियम और शर्तें','Terms & conditions'],
    'Users must be 18+ and follow Indian legal rules. Real-money gaming is subject to the platform rules and admin verification.': ['उपयोगकर्ता की उम्र 18 वर्ष या अधिक होनी चाहिए और भारतीय कानूनों का पालन करना होगा। असली पैसों वाले गेम प्लेटफ़ॉर्म के नियमों और एडमिन सत्यापन के अधीन हैं।','Users must be 18+ and follow Indian legal rules. Real-money gaming is subject to the platform rules and admin verification.'],
    'Any suspicious or fraudulent activity including fake payment proof, multi-accounting, or cheating may lead to account suspension and balance freeze.': ['नकली भुगतान प्रमाण, कई खाते या धोखाधड़ी जैसी संदिग्ध गतिविधि से खाता निलंबित और बैलेंस फ्रीज़ हो सकता है।','Suspicious activity such as fake payment proof, multiple accounts, or cheating may lead to account suspension and a frozen balance.'],
    'Responsible Gaming': ['जिम्मेदारी से गेम खेलें','Responsible gaming'],
    'Players should play responsibly and avoid excessive losses. Withdrawals are subject to verification and platform policy. Support is available for account issues and payment assistance.': ['खिलाड़ियों को जिम्मेदारी से खेलना चाहिए और अधिक नुकसान से बचना चाहिए। निकासी सत्यापन और प्लेटफ़ॉर्म नीति के अधीन है। खाता और भुगतान सहायता उपलब्ध है।','Players should play responsibly and avoid excessive losses. Withdrawals are subject to verification and platform policy. Support is available for account issues and payment assistance.'],
    'Call / WhatsApp:': ['कॉल / व्हाट्सऐप:','Call / WhatsApp:'],
    'Email:': ['ईमेल:','Email:'],
    'Add Money - KhiladiAdda24': ['पैसे जमा करें - KhiladiAdda24','Add money - KhiladiAdda24'],
    'Amount (e.g. ₹100)': ['राशि (जैसे ₹100)','Amount (e.g. ₹100)'],
    'QR Code Show Karein': ['QR कोड दिखाएं','Show QR code'],
    'Payment ke baad Details Dalein:': ['भुगतान के बाद जानकारी भरें:','Enter details after payment:'],
    '12 Digit UTR / Ref Number': ['12 अंकों का UTR / संदर्भ नंबर','12-digit UTR / reference number'],
    'Deposit Submit': ['जमा अनुरोध भेजें','Submit deposit'],
    'Not configured': ['सेट नहीं किया गया','Not configured'],
    'KhiladiAdda24 Admin': ['KhiladiAdda24 एडमिन','KhiladiAdda24 Admin'],
    'Player Site': ['खिलाड़ियों की साइट','Player site'],
    'Refresh data': ['डेटा रीफ़्रेश करें','Refresh data'],
    'Running Games': ['चल रहे गेम','Running games'],
    'Loading...': ['लोड हो रहा है...','Loading...'],
    'Running games load ho rahe hain...': ['चल रहे गेम लोड हो रहे हैं...','Loading running games...'],
    'Admin Notifications': ['एडमिन सूचनाएं','Admin notifications'],
    'Pending work check ho raha hai...': ['लंबित काम की जांच हो रही है...','Checking pending work...'],
    'Notification Line': ['सूचना संदेश','Notification line'],
    'Top ke niche ya banner ke upar chali hui line admin se edit hogi.': ['ऊपर या बैनर के ऊपर दिखने वाला संदेश यहां एडिट करें।','Edit the message shown under the top bar or above the banner here.'],
    'Welcome to khiladiadda24.com': ['khiladiadda24.com पर आपका स्वागत है','Welcome to khiladiadda24.com'],
    'Save notification line': ['सूचना संदेश सेव करें','Save notification line'],
    'WhatsApp & Support Numbers': ['व्हाट्सऐप और सहायता नंबर','WhatsApp & support numbers'],
    'Dono fields mein valid 10-digit Indian mobile number dalein. WhatsApp aur support ke numbers alag ho sakte hain.': ['दोनों जगह सही 10 अंकों का भारतीय मोबाइल नंबर डालें। व्हाट्सऐप और सहायता के नंबर अलग हो सकते हैं।','Enter a valid 10-digit Indian mobile number in both fields. WhatsApp and support numbers can differ.'],
    'Support phone': ['सहायता फ़ोन','Support phone'],
    'WhatsApp phone': ['व्हाट्सऐप फ़ोन','WhatsApp phone'],
    'Save contact numbers': ['संपर्क नंबर सेव करें','Save contact numbers'],
    'Site Logo & App Icons': ['साइट लोगो और ऐप आइकन','Site logo & app icons'],
    'PNG images upload karke logo, app icon, game banners aur support graphic badlein. App icons ki dimensions exact rakhein.': ['PNG तस्वीरें अपलोड करके लोगो, ऐप आइकन, गेम बैनर और सहायता ग्राफ़िक बदलें। ऐप आइकन का आकार सही रखें।','Upload PNG images to change the logo, app icon, game banners, and support graphic. Keep app icon dimensions exact.'],
    'Login logo PNG': ['लॉगिन लोगो PNG','Login logo PNG'],
    'App icon PNG (192 x 192)': ['ऐप आइकन PNG (192 x 192)','App icon PNG (192 x 192)'],
    'Save': ['सेव करें','Save'],
    'Search': ['खोजें','Search'],
    'All': ['सभी','All'],
    'Active': ['सक्रिय','Active'],
    'Blocked': ['ब्लॉक किए गए','Blocked'],
    'Deposits': ['जमा','Deposits'],
    'Withdrawals': ['निकासी','Withdrawals'],
    'Matches': ['मैच','Matches'],
    'Approve': ['मंज़ूर करें','Approve'],
    'Reject': ['अस्वीकार करें','Reject'],
    'View': ['देखें','View'],
    'Delete': ['हटाएं','Delete'],
    'Open': ['खोलें','Open'],
    'Close': ['बंद करें','Close'],
    'App icon PNG (512 x 512)': ['ऐप आइकन PNG (512 x 512)','App icon PNG (512 x 512)'],
    'Home battle banner PNG': ['होम बैटल बैनर PNG','Home battle banner PNG'],
    'Ludo card PNG': ['लूडो कार्ड PNG','Ludo card PNG'],
    'Snake card PNG': ['स्नेक कार्ड PNG','Snake card PNG'],
    'Support banner PNG': ['सहायता बैनर PNG','Support banner PNG'],
    'Save selected images': ['चुनी गई तस्वीरें सेव करें','Save selected images'],
    'Loading current images...': ['मौजूदा तस्वीरें लोड हो रही हैं...','Loading current images...'],
    'Deposit UPI ID': ['जमा करने की UPI ID','Deposit UPI ID'],
    'Player deposit QR aur UPI app payment ke liye use hone wala UPI ID.': ['खिलाड़ियों के QR जमा और UPI ऐप भुगतान के लिए इस्तेमाल होने वाली UPI ID।','UPI ID used for player QR deposits and UPI app payments.'],
    'Save deposit UPI ID': ['जमा UPI ID सेव करें','Save deposit UPI ID'],
    'Player Text Settings': ['खिलाड़ी पेज के टेक्स्ट की सेटिंग','Player text settings'],
    'Player pages ki kisi bhi exact line ko badalne ke liye current line aur naya text bharein. Blank naya text us line ko hide karega.': ['खिलाड़ी पेज की कोई लाइन बदलने के लिए मौजूदा लाइन और नया टेक्स्ट भरें। नया टेक्स्ट खाली छोड़ने पर वह लाइन छिप जाएगी।','Enter the current and replacement text to change a line on player pages. Leave new text blank to hide that line.'],
    'Add text line': ['टेक्स्ट लाइन जोड़ें','Add text line'],
    'Save player text': ['खिलाड़ी का टेक्स्ट सेव करें','Save player text'],
    'Deposit & Withdrawal Summary': ['जमा और निकासी का सारांश','Deposit & withdrawal summary'],
    'Total deposits approved': ['कुल मंज़ूर जमा','Total deposits approved'],
    'Withdrawals paid': ['भुगतान की गई निकासी','Withdrawals paid'],
    'Withdrawals pending': ['लंबित निकासी','Withdrawals pending'],
    "Players' wallet balance": ['खिलाड़ियों का वॉलेट बैलेंस', "Players' wallet balance"],
    'Loading totals...': ['कुल राशि लोड हो रही है...','Loading totals...'],
    'Wallet Update': ['वॉलेट अपडेट','Wallet update'],
    'Player wallet me amount add ya deduct karein.': ['खिलाड़ी के वॉलेट में राशि जोड़ें या घटाएं।','Add or deduct an amount from a player wallet.'],
    'Update Wallet': ['वॉलेट अपडेट करें','Update wallet'],
    'Bonus Credit': ['बोनस जमा करें','Bonus credit'],
    'Bonus direct player wallet me add hoga.': ['बोनस सीधे खिलाड़ी के वॉलेट में जमा होगा।','Bonus will be added directly to the player wallet.'],
    'Add Bonus': ['बोनस जोड़ें','Add bonus'],
    'All Players & Wallets': ['सभी खिलाड़ी और वॉलेट','All players & wallets'],
    'All players': ['सभी खिलाड़ी','All players'],
    'New players · 7 days': ['नए खिलाड़ी · 7 दिन','New players · 7 days'],
    'S.N.': ['क्रम संख्या','S.N.'],
    'Phone': ['फ़ोन','Phone'],
    'Joined': ['शामिल हुए','Joined'],
    'Status': ['स्थिति','Status'],
    'Action': ['कार्रवाई','Action'],
    'Pending Deposits (QR Verify)': ['लंबित जमा (QR सत्यापन)','Pending deposits (QR verify)'],
    'User': ['उपयोगकर्ता','User'],
    'Amount': ['राशि','Amount'],
    'UTR': ['UTR','UTR'],
    'Proof': ['प्रमाण','Proof'],
    'Pending Aadhaar KYC': ['लंबित आधार KYC','Pending Aadhaar KYC'],
    'Target: har KYC ko submission ke 30 minutes ke andar review karein.': ['लक्ष्य: हर KYC को जमा होने के 30 मिनट के अंदर जांचें।','Target: review each KYC within 30 minutes of submission.'],
    'Aadhaar': ['आधार','Aadhaar'],
    'Image': ['तस्वीर','Image'],
    'Submitted': ['जमा किया गया','Submitted'],
    'Pending Match Results': ['लंबित मैच नतीजे','Pending match results'],
    'Game / Entry': ['गेम / एंट्री','Game / entry'],
    'Players': ['खिलाड़ी','Players'],
    'Winner / Cancel reason': ['विजेता / रद्द करने का कारण','Winner / cancellation reason'],
    'Room / Start': ['रूम / शुरू करें','Room / start'],
    'Room / Deadline': ['रूम / समय-सीमा','Room / deadline'],
    'Confirmations': ['पुष्टियां','Confirmations'],
    'Cancel reason': ['रद्द करने का कारण','Cancellation reason'],
    'Cancel Requests for Review': ['समीक्षा के लिए रद्द अनुरोध','Cancellation requests for review'],
    'Requested by': ['अनुरोधकर्ता','Requested by'],
    'Entry refund': ['एंट्री राशि वापस','Entry refund'],
    'Pending Withdrawals': ['लंबित निकासी','Pending withdrawals'],
    'Method': ['तरीका','Method'],
    'Payout details': ['भुगतान की जानकारी','Payout details'],
    'QR': ['QR','QR'],
    'Complete Game History': ['पूरा गेम इतिहास','Complete game history'],
    'Joined / Started': ['शामिल हुए / शुरू हुआ','Joined / started'],
    '⌂ Home': ['⌂ होम','⌂ Home'],
    'New players': ['नए खिलाड़ी','New players'],
    'Player history': ['खिलाड़ी का इतिहास','Player history'],
    'Player history load ho rahi hai...': ['खिलाड़ी का इतिहास लोड हो रहा है...','Loading player history...'],
    'Edit player KYC': ['खिलाड़ी की KYC एडिट करें','Edit player KYC'],
    'Save karne ke baad KYC pending review mein rahegi.': ['सेव करने के बाद KYC समीक्षा के लिए लंबित रहेगी।','After saving, KYC will remain pending review.'],
    'Replace Aadhaar image (optional)': ['आधार की तस्वीर बदलें (वैकल्पिक)','Replace Aadhaar image (optional)'],
    'Save KYC': ['KYC सेव करें','Save KYC']
  };

  const originalTitle = document.title;
  const entries = Object.entries(translations).map(([source, value]) => [source, Array.isArray(value) ? value : [value, source]]).sort(([left], [right]) => right.length - left.length);
  const textSources = new WeakMap();
  const attributeSources = new WeakMap();
  const pendingRoots = new Set();
  let timer;

  function translate(text, language) {
    let result = text;
    for (const [source, values] of entries) {
      const replacement = values[language === 'en' ? 1 : 0];
      if (source !== replacement) result = result.split(source).join(replacement);
    }
    return result;
  }

  function translateNode(node, language) {
    const previous = textSources.get(node);
    const source = previous && node.nodeValue === previous.rendered ? previous.source : node.nodeValue;
    const rendered = translate(source, language);
    textSources.set(node, { source, rendered });
    if (node.nodeValue !== rendered) node.nodeValue = rendered;
  }

  function translateSubtree(root, language = localStorage.getItem('appLanguage') || 'hi') {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.parentElement?.closest('script,style,noscript')) translateNode(node, language);
    }
    const elements = root.nodeType === Node.ELEMENT_NODE ? [root, ...root.querySelectorAll('*')] : [...root.querySelectorAll('*')];
    for (const element of elements) {
      if (element.closest('script,style,noscript')) continue;
      for (const attribute of ['placeholder', 'title', 'aria-label', 'alt']) {
        if (!element.hasAttribute(attribute)) continue;
        let values = attributeSources.get(element);
        if (!values) {
          values = new Map();
          attributeSources.set(element, values);
        }
        const previous = values.get(attribute);
        const current = element.getAttribute(attribute);
        const source = previous && current === previous.rendered ? previous.source : current;
        const rendered = translate(source, language);
        values.set(attribute, { source, rendered });
        if (current !== rendered) element.setAttribute(attribute, rendered);
      }
    }
  }

  function applyLanguage(language = localStorage.getItem('appLanguage') || 'hi') {
    const currentLanguage = language === 'en' ? 'en' : 'hi';
    localStorage.setItem('appLanguage', currentLanguage);
    document.documentElement.lang = currentLanguage;
    document.title = translate(originalTitle, currentLanguage);
    translateSubtree(document.body, currentLanguage);
    document.querySelectorAll('[data-lang-toggle]').forEach(button => {
      const active = button.dataset.langToggle === currentLanguage;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  if (!document.querySelector('[data-lang-toggle]')) {
    const style = document.createElement('style');
    style.textContent = '.site-language-toggle{position:fixed;top:12px;right:12px;z-index:1000;display:flex;align-items:center;gap:3px;padding:4px;border:1px solid #718174;border-radius:8px;background:#18251d;box-shadow:0 4px 14px #0005}.site-language-toggle button{width:auto;min-width:34px;min-height:28px;margin:0;padding:5px 7px;border:0;border-radius:5px;color:#eef5ef;background:transparent;font:700 11px/1.2 Arial,sans-serif;cursor:pointer}.site-language-toggle button.active{color:#18251d;background:#f0c85b}';
    document.head.append(style);
    const toggle = document.createElement('div');
    toggle.className = 'site-language-toggle';
    toggle.setAttribute('aria-label', 'Language selector');
    for (const language of ['hi', 'en']) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.langToggle = language;
      button.textContent = language.toUpperCase();
      toggle.append(button);
    }
    document.body.append(toggle);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-lang-toggle]');
    if (button) applyLanguage(button.dataset.langToggle);
  });

  const nativeDialogs = { alert: window.alert.bind(window), confirm: window.confirm.bind(window), prompt: window.prompt.bind(window) };
  window.alert = message => nativeDialogs.alert(translate(String(message), localStorage.getItem('appLanguage') || 'hi'));
  window.confirm = message => nativeDialogs.confirm(translate(String(message), localStorage.getItem('appLanguage') || 'hi'));
  window.prompt = (message, value) => nativeDialogs.prompt(translate(String(message), localStorage.getItem('appLanguage') || 'hi'), value);

  const observer = new MutationObserver(records => {
    for (const record of records) {
      const root = record.type === 'attributes' ? record.target : record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
      if (root) pendingRoots.add(root);
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      const roots = [...pendingRoots];
      pendingRoots.clear();
      roots.forEach(root => translateSubtree(root));
    }, 0);
  });

  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label', 'alt'] });
  window.siteI18n = { apply: applyLanguage, translate };
  applyLanguage();
})();
