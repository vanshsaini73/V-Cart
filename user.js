const navLinks = document.querySelectorAll('.nav-item[data-section]');
const contentSections = document.querySelectorAll('.content-section');
const profileForm = document.getElementById('profile-form');
const profileFields = {
	name: document.getElementById('profile-name'),
	email: document.getElementById('profile-email'),
	mobile: document.getElementById('profile-mobile'),
	gender: document.getElementById('profile-gender'),
	dob: document.getElementById('profile-dob'),
	address: document.getElementById('profile-address')
};
const profilePhotoInput = document.getElementById('profile-photo');
const profilePhotoImage = document.getElementById('profile-photo-image');
const headerProfileImage = document.getElementById('header-profile-image');
const profileSaveStatus = document.getElementById('profile-save-status');
const languageSelect = document.getElementById('language-select');
const logoutButton = document.querySelector('.profile-logout');
const languageCodes = ['en', 'hi', 'pa', 'bn', 'ta', 'te'];
const addressGroups = {
	permanent: {
		name: document.getElementById('permanent-name'),
		mobile: document.getElementById('permanent-mobile'),
		line: document.getElementById('permanent-line'),
		city: document.getElementById('permanent-city'),
		postal: document.getElementById('permanent-postal')
	},
	delivery: {
		name: document.getElementById('delivery-name'),
		mobile: document.getElementById('delivery-mobile'),
		line: document.getElementById('delivery-line'),
		city: document.getElementById('delivery-city'),
		postal: document.getElementById('delivery-postal')
	}
};

if (logoutButton) {
	logoutButton.addEventListener('click', async () => {
		try {
			await window.VCartSession.clear();
		} catch (error) {
			console.error('Could not clear the customer session.', error);
			alert('Could not log out. Check your internet connection and try again.');
			return;
		}
		window.location.href = 'index.html';
	});
}

const translations = {
	"title.page": ["VCart | Customer Panel", "VCart | ग्राहक पैनल", "VCart | ਗਾਹਕ ਪੈਨਲ", "VCart | গ্রাহক প্যানেল", "VCart | வாடிக்கையாளர் பகுதி", "VCart | వినియోగదారుల విభాగం"],
	"brand.description": ["Customer Panel", "ग्राहक पैनल", "ਗਾਹਕ ਪੈਨਲ", "গ্রাহক প্যানেল", "வாடிக்கையாளர் பகுதி", "వినియోగదారుల విభాగం"],
	"header.logout": ["Logout", "लॉग आउट", "ਲੌਗ ਆਉਟ", "লগ আউট", "வெளியேறு", "లాగ్ అవుట్"],
	"nav.profile": ["Profile", "प्रोफ़ाइल", "ਪ੍ਰੋਫ਼ਾਈਲ", "প্রোফাইল", "சுயவிவரம்", "ప్రొఫైల్"],
	"nav.orders": ["My Orders", "मेरे ऑर्डर", "ਮੇਰੇ ਆਰਡਰ", "আমার অর্ডার", "என் ஆர்டர்கள்", "నా ఆర్డర్లు"],
	"nav.wishlist": ["My Wishlist", "मेरी पसंद", "ਮੇਰੀ ਇੱਛਾ-ਸੂਚੀ", "আমার পছন্দের তালিকা", "விருப்பப் பட்டியல்", "నా కోరికల జాబితా"],
	"nav.cart": ["My Cart", "मेरी कार्ट", "ਮੇਰੀ ਕਾਰਟ", "আমার কার্ট", "என் வண்டி", "నా కార్ట్"],
	"nav.addresses": ["My Addresses", "मेरे पते", "ਮੇਰੇ ਪਤੇ", "আমার ঠিকানা", "என் முகவரிகள்", "నా చిరునామాలు"],
	"nav.wallet": ["Payment & Wallet", "भुगतान और वॉलेट", "ਭੁਗਤਾਨ ਅਤੇ ਵਾਲਿਟ", "পেমেন্ট ও ওয়ালেট", "பணம் செலுத்துதல் மற்றும் வாலெட்", "చెల్లింపులు మరియు వాలెట్"],
	"nav.offers": ["Coupons & Offers", "कूपन और ऑफ़र", "ਕੂਪਨ ਅਤੇ ਆਫ਼ਰ", "কুপন ও অফার", "கூப்பன்கள் மற்றும் சலுகைகள்", "కూపన్లు మరియు ఆఫర్లు"],
	"nav.returns": ["Returns & Refunds", "वापसी और रिफ़ंड", "ਵਾਪਸੀ ਅਤੇ ਰਿਫੰਡ", "ফেরত ও রিফান্ড", "திருப்பி அனுப்புதல் மற்றும் பணத்திருப்பம்", "రిటర్న్‌లు మరియు రీఫండ్‌లు"],
	"nav.help": ["Help & Support", "सहायता और समर्थन", "ਮਦਦ ਅਤੇ ਸਹਾਇਤਾ", "সাহায্য ও সহায়তা", "உதவி மற்றும் ஆதரவு", "సహాయం మరియు మద్దతు"],
	"nav.settings": ["Settings", "सेटिंग्स", "ਸੈਟਿੰਗਾਂ", "সেটিংস", "அமைப்புகள்", "సెట్టింగ్‌లు"],
	"profile.title": ["Personal Information", "व्यक्तिगत जानकारी", "ਨਿੱਜੀ ਜਾਣਕਾਰੀ", "ব্যক্তিগত তথ্য", "தனிப்பட்ட தகவல்", "వ్యక్తిగత సమాచారం"],
	"profile.description": ["Manage your profile details and contact information.", "अपनी प्रोफ़ाइल और संपर्क जानकारी प्रबंधित करें।", "ਆਪਣੀ ਪ੍ਰੋਫ਼ਾਈਲ ਅਤੇ ਸੰਪਰਕ ਜਾਣਕਾਰੀ ਸੰਭਾਲੋ।", "আপনার প্রোফাইল ও যোগাযোগের তথ্য পরিচালনা করুন।", "உங்கள் சுயவிவர மற்றும் தொடர்புத் தகவல்களை நிர்வகிக்கவும்.", "మీ ప్రొఫైల్ మరియు సంప్రదింపు వివరాలను నిర్వహించండి."],
	"profile.choosePhoto": ["Choose profile photo", "प्रोफ़ाइल फ़ोटो चुनें", "ਪ੍ਰੋਫ਼ਾਈਲ ਫੋਟੋ ਚੁਣੋ", "প্রোফাইলের ছবি বেছে নিন", "சுயவிவரப் படத்தைத் தேர்ந்தெடுக்கவும்", "ప్రొఫైల్ ఫోటోను ఎంచుకోండి"],
	"profile.photoHint": ["JPG, PNG or GIF. Maximum size 1 MB.", "JPG, PNG या GIF. अधिकतम आकार 1 MB।", "JPG, PNG ਜਾਂ GIF। ਵੱਧ ਤੋਂ ਵੱਧ ਆਕਾਰ 1 MB।", "JPG, PNG বা GIF। সর্বোচ্চ আকার 1 MB।", "JPG, PNG அல்லது GIF. அதிகபட்ச அளவு 1 MB.", "JPG, PNG లేదా GIF. గరిష్ఠ పరిమాణం 1 MB."],
	"profile.photoAlt": ["Profile photo", "प्रोफ़ाइल फ़ोटो", "ਪ੍ਰੋਫ਼ਾਈਲ ਫੋਟੋ", "প্রোফাইলের ছবি", "சுயவிவரப் படம்", "ప్రొఫైల్ ఫోటో"],
	"profile.save": ["Save changes", "बदलाव सहेजें", "ਤਬਦੀਲੀਆਂ ਸੰਭਾਲੋ", "পরিবর্তন সংরক্ষণ করুন", "மாற்றங்களைச் சேமிக்கவும்", "మార్పులను సేవ్ చేయండి"],
	"field.fullName": ["Full name", "पूरा नाम", "ਪੂਰਾ ਨਾਮ", "পুরো নাম", "முழுப் பெயர்", "పూర్తి పేరు"],
	"field.email": ["Email address", "ईमेल पता", "ਈਮੇਲ ਪਤਾ", "ইমেল ঠিকানা", "மின்னஞ்சல் முகவரி", "ఇమెయిల్ చిరునామా"],
	"field.mobile": ["Mobile number", "मोबाइल नंबर", "ਮੋਬਾਈਲ ਨੰਬਰ", "মোবাইল নম্বর", "கைபேசி எண்", "మొబైల్ నంబర్"],
	"field.gender": ["Gender", "लिंग", "ਲਿੰਗ", "লিঙ্গ", "பாலினம்", "లింగం"],
	"field.dob": ["Date of birth", "जन्म तिथि", "ਜਨਮ ਮਿਤੀ", "জন্ম তারিখ", "பிறந்த தேதி", "పుట్టిన తేదీ"],
	"field.address": ["Address", "पता", "ਪਤਾ", "ঠিকানা", "முகவரி", "చిరునామా"],
	"field.city": ["City", "शहर", "ਸ਼ਹਿਰ", "শহর", "நகரம்", "నగరం"],
	"field.pin": ["PIN code", "पिन कोड", "ਪਿੰਨ ਕੋਡ", "পিন কোড", "அஞ்சல் குறியீடு", "పిన్ కోడ్"],
	"placeholder.fullName": ["Enter your full name", "अपना पूरा नाम दर्ज करें", "ਆਪਣਾ ਪੂਰਾ ਨਾਮ ਦਰਜ ਕਰੋ", "আপনার পুরো নাম লিখুন", "உங்கள் முழுப் பெயரை உள்ளிடவும்", "మీ పూర్తి పేరును నమోదు చేయండి"],
	"placeholder.email": ["you@example.com", "आप@example.com", "you@example.com", "you@example.com", "you@example.com", "you@example.com"],
	"placeholder.mobile": ["Enter your mobile number", "अपना मोबाइल नंबर दर्ज करें", "ਆਪਣਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ", "আপনার মোবাইল নম্বর লিখুন", "உங்கள் கைபேசி எண்ணை உள்ளிடவும்", "మీ మొబైల్ నంబర్‌ను నమోదు చేయండి"],
	"placeholder.address": ["Enter your address", "अपना पता दर्ज करें", "ਆਪਣਾ ਪਤਾ ਦਰਜ ਕਰੋ", "আপনার ঠিকানা লিখুন", "உங்கள் முகவரியை உள்ளிடவும்", "మీ చిరునామాను నమోదు చేయండి"],
	"placeholder.fullNameShort": ["Enter full name", "पूरा नाम दर्ज करें", "ਪੂਰਾ ਨਾਮ ਦਰਜ ਕਰੋ", "পুরো নাম লিখুন", "முழுப் பெயரை உள்ளிடவும்", "పూర్తి పేరును నమోదు చేయండి"],
	"placeholder.mobileShort": ["Enter mobile number", "मोबाइल नंबर दर्ज करें", "ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ", "মোবাইল নম্বর লিখুন", "கைபேசி எண்ணை உள்ளிடவும்", "మొబైల్ నంబర్‌ను నమోదు చేయండి"],
	"placeholder.street": ["House number, street, area", "मकान नंबर, सड़क, इलाका", "ਮਕਾਨ ਨੰਬਰ, ਗਲੀ, ਇਲਾਕਾ", "বাড়ির নম্বর, রাস্তা, এলাকা", "வீட்டு எண், தெரு, பகுதி", "ఇంటి నంబర్, వీధి, ప్రాంతం"],
	"placeholder.city": ["Enter city", "शहर दर्ज करें", "ਸ਼ਹਿਰ ਦਰਜ ਕਰੋ", "শহর লিখুন", "நகரத்தை உள்ளிடவும்", "నగరాన్ని నమోదు చేయండి"],
	"placeholder.pin": ["Enter PIN code", "पिन कोड दर्ज करें", "ਪਿੰਨ ਕੋਡ ਦਰਜ ਕਰੋ", "পিন কোড লিখুন", "அஞ்சல் குறியீட்டை உள்ளிடவும்", "పిన్ కోడ్‌ను నమోదు చేయండి"],
	"gender.select": ["Select gender", "लिंग चुनें", "ਲਿੰਗ ਚੁਣੋ", "লিঙ্গ বেছে নিন", "பாலினத்தைத் தேர்ந்தெடுக்கவும்", "లింగాన్ని ఎంచుకోండి"],
	"gender.female": ["Female", "महिला", "ਔਰਤ", "মহিলা", "பெண்", "స్త్రీ"],
	"gender.male": ["Male", "पुरुष", "ਮਰਦ", "পুরুষ", "ஆண்", "పురుషుడు"],
	"gender.other": ["Other", "अन्य", "ਹੋਰ", "অন্যান্য", "மற்றவை", "ఇతరులు"],
	"gender.private": ["Prefer not to say", "बताना नहीं चाहते", "ਦੱਸਣਾ ਨਹੀਂ ਚਾਹੁੰਦੇ", "জানাতে চাই না", "தெரிவிக்க விரும்பவில்லை", "చెప్పదలచుకోలేదు"],
	"section.orders": ["My Orders", "मेरे ऑर्डर", "ਮੇਰੇ ਆਰਡਰ", "আমার অর্ডার", "என் ஆர்டர்கள்", "నా ఆర్డర్లు"],
	"section.wishlist": ["My Wishlist", "मेरी पसंद", "ਮੇਰੀ ਇੱਛਾ-ਸੂਚੀ", "আমার পছন্দের তালিকা", "விருப்பப் பட்டியல்", "నా కోరికల జాబితా"],
	"section.cart": ["My Cart", "मेरी कार्ट", "ਮੇਰੀ ਕਾਰਟ", "আমার কার্ট", "என் வண்டி", "నా కార్ట్"],
	"section.wallet": ["Payment & Wallet", "भुगतान और वॉलेट", "ਭੁਗਤਾਨ ਅਤੇ ਵਾਲਿਟ", "পেমেন্ট ও ওয়ালেট", "பணம் செலுத்துதல் மற்றும் வாலெட்", "చెల్లింపులు మరియు వాలెట్"],
	"section.offers": ["Coupons & Offers", "कूपन और ऑफ़र", "ਕੂਪਨ ਅਤੇ ਆਫ਼ਰ", "কুপন ও অফার", "கூப்பன்கள் மற்றும் சலுகைகள்", "కూపన్లు మరియు ఆఫర్లు"],
	"offers.title": ["Coupons & Offers", "कूपन और ऑफ़र", "ਕੂਪਨ ਅਤੇ ਆਫ਼ਰ", "কুপন ও অফার", "கூப்பன்கள் மற்றும் சலுகைகள்", "కూపన్లు మరియు ఆఫర్లు"],
	"offers.subtitle": ["Pick an offer, copy its code, and use it at checkout.", "ऑफ़र चुनें, उसका कोड कॉपी करें और चेकआउट पर इस्तेमाल करें।", "ਆਫ਼ਰ ਚੁਣੋ, ਇਸਦਾ ਕੋਡ ਕਾਪੀ ਕਰੋ ਅਤੇ ਚੈੱਕਆਉਟ ਵੇਲੇ ਵਰਤੋ।", "অফার বেছে নিন, কোড কপি করুন এবং চেকআউটে ব্যবহার করুন।", "சலுகையைத் தேர்ந்தெடுத்து, குறியீட்டை நகலெடுத்து, கட்டணத்தின் போது பயன்படுத்தவும்.", "ఆఫర్‌ను ఎంచుకుని, కోడ్‌ను కాపీ చేసి చెక్అవుట్‌లో ఉపయోగించండి."],
	"offers.limited": ["Limited time", "सीमित समय", "ਸੀਮਤ ਸਮਾਂ", "সীমিত সময়", "குறிப்பிட்ட காலம்", "పరిమిత సమయం"],
	"offers.off": ["OFF", "छूट", "ਛੂਟ", "ছাড়", "தள்ளுபடி", "తగ్గింపు"],
	"offers.tenTitle": ["Save 10% on your order", "अपने ऑर्डर पर 10% बचाएँ", "ਆਪਣੇ ਆਰਡਰ 'ਤੇ 10% ਬਚਾਓ", "অর্ডারে ১০% সাশ্রয় করুন", "உங்கள் ஆர்டரில் 10% சேமிக்கவும்", "మీ ఆర్డర్‌పై 10% ఆదా చేయండి"],
	"offers.tenDescription": ["Get 10% off on eligible products across the store.", "स्टोर के चुनिंदा उत्पादों पर 10% की छूट पाएँ।", "ਸਟੋਰ ਦੇ ਚੁਣੇ ਉਤਪਾਦਾਂ 'ਤੇ 10% ਛੂਟ ਲਵੋ।", "স্টোরের নির্বাচিত পণ্যে ১০% ছাড় পান।", "கடையில் தேர்ந்தெடுக்கப்பட்ட பொருட்களுக்கு 10% தள்ளுபடி பெறுங்கள்.", "స్టోర్‌లోని ఎంపిక చేసిన ఉత్పత్తులపై 10% తగ్గింపు పొందండి."],
	"offers.tenTerms": ["Minimum order: ₹499 · Maximum discount: ₹150", "न्यूनतम ऑर्डर: ₹499 · अधिकतम छूट: ₹150", "ਘੱਟੋ-ਘੱਟ ਆਰਡਰ: ₹499 · ਵੱਧ ਤੋਂ ਵੱਧ ਛੂਟ: ₹150", "ন্যূনতম অর্ডার: ₹৪৯৯ · সর্বোচ্চ ছাড়: ₹১৫০", "குறைந்தபட்ச ஆர்டர்: ₹499 · அதிகபட்ச தள்ளுபடி: ₹150", "కనీస ఆర్డర్: ₹499 · గరిష్ఠ తగ్గింపు: ₹150"],
	"offers.bestValue": ["Best value", "सबसे बेहतर ऑफ़र", "ਸਭ ਤੋਂ ਵਧੀਆ ਆਫ਼ਰ", "সেরা অফার", "சிறந்த சலுகை", "ఉత్తమ ఆఫర్"],
	"offers.twentyTitle": ["Extra savings for your first order", "अपने पहले ऑर्डर पर अतिरिक्त बचत", "ਆਪਣੇ ਪਹਿਲੇ ਆਰਡਰ 'ਤੇ ਵਾਧੂ ਬਚਤ", "প্রথম অর্ডারে অতিরিক্ত সাশ্রয়", "முதல் ஆர்டரில் கூடுதல் சேமிப்பு", "మీ మొదటి ఆర్డర్‌పై అదనపు ఆదా"],
	"offers.twentyDescription": ["Enjoy a bigger discount on your first purchase.", "पहली खरीदारी पर बड़ी छूट पाएँ।", "ਪਹਿਲੀ ਖਰੀਦ 'ਤੇ ਵੱਡੀ ਛੂਟ ਲਵੋ।", "প্রথম কেনাকাটায় বেশি ছাড় উপভোগ করুন।", "முதல் வாங்குதலில் அதிக தள்ளுபடியைப் பெறுங்கள்.", "మొదటి కొనుగోలుపై ఎక్కువ తగ్గింపు పొందండి."],
	"offers.twentyTerms": ["Minimum order: ₹799 · Maximum discount: ₹300", "न्यूनतम ऑर्डर: ₹799 · अधिकतम छूट: ₹300", "ਘੱਟੋ-ਘੱਟ ਆਰਡਰ: ₹799 · ਵੱਧ ਤੋਂ ਵੱਧ ਛੂਟ: ₹300", "ন্যূনতম অর্ডার: ₹৭৯৯ · সর্বোচ্চ ছাড়: ₹৩০০", "குறைந்தபட்ச ஆர்டர்: ₹799 · அதிகபட்ச தள்ளுபடி: ₹300", "కనీస ఆర్డర్: ₹799 · గరిష్ఠ తగ్గింపు: ₹300"],
	"offers.delivery": ["Delivery offer", "डिलीवरी ऑफ़र", "ਡਿਲੀਵਰੀ ਆਫ਼ਰ", "ডেলিভারি অফার", "டெலிவரி சலுகை", "డెలివరీ ఆఫర్"],
	"offers.free": ["FREE", "मुफ़्त", "ਮੁਫ਼ਤ", "বিনামূল্যে", "இலவசம்", "ఉచితం"],
	"offers.shippingTitle": ["Free delivery on your order", "अपने ऑर्डर पर मुफ़्त डिलीवरी पाएँ", "ਆਪਣੇ ਆਰਡਰ 'ਤੇ ਮੁਫ਼ਤ ਡਿਲੀਵਰੀ ਲਵੋ", "অর্ডারে বিনামূল্যে ডেলিভারি পান", "உங்கள் ஆர்டருக்கு இலவச டெலிவரி பெறுங்கள்", "మీ ఆర్డర్‌పై ఉచిత డెలివరీ పొందండి"],
	"offers.shippingDescription": ["Save on delivery charges when you shop more.", "ज़्यादा खरीदारी पर डिलीवरी शुल्क बचाएँ।", "ਵੱਧ ਖਰੀਦਦਾਰੀ 'ਤੇ ਡਿਲੀਵਰੀ ਖਰਚ ਬਚਾਓ।", "বেশি কেনাকাটায় ডেলিভারি খরচ বাঁচান।", "அதிகமாக வாங்கும்போது டெலிவரி கட்டணத்தைச் சேமிக்கவும்.", "ఎక్కువగా షాపింగ్ చేస్తే డెలివరీ ఛార్జీలు ఆదా చేయండి."],
	"offers.shippingTerms": ["Minimum order: ₹299 · No maximum discount", "न्यूनतम ऑर्डर: ₹299 · अधिकतम सीमा नहीं", "ਘੱਟੋ-ਘੱਟ ਆਰਡਰ: ₹299 · ਵੱਧ ਤੋਂ ਵੱਧ ਛੂਟ ਦੀ ਕੋਈ ਸੀਮਾ ਨਹੀਂ", "ন্যূনতম অর্ডার: ₹২৯৯ · সর্বোচ্চ ছাড়ের সীমা নেই", "குறைந்தபட்ச ஆர்டர்: ₹299 · அதிகபட்ச வரம்பு இல்லை", "కనీస ఆర్డర్: ₹299 · గరిష్ఠ పరిమితి లేదు"],
	"offers.copy": ["Copy code", "कोड कॉपी करें", "ਕੋਡ ਕਾਪੀ ਕਰੋ", "কোড কপি করুন", "குறியீட்டை நகலெடு", "కోడ్‌ను కాపీ చేయండి"],
	"offers.copied": ["Coupon code copied.", "कूपन कोड कॉपी हो गया।", "ਕੂਪਨ ਕੋਡ ਕਾਪੀ ਹੋ ਗਿਆ।", "কুপন কোড কপি হয়েছে।", "கூப்பன் குறியீடு நகலெடுக்கப்பட்டது.", "కూపన్ కోడ్ కాపీ చేయబడింది."],
	"offers.copyFailed": ["Could not copy the code. Please copy it manually.", "कोड कॉपी नहीं हो पाया। कृपया इसे खुद कॉपी करें।", "ਕੋਡ ਕਾਪੀ ਨਹੀਂ ਹੋ ਸਕਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਇਸਨੂੰ ਖੁਦ ਕਾਪੀ ਕਰੋ।", "কোড কপি করা যায়নি। অনুগ্রহ করে নিজে কপি করুন।", "குறியீட்டை நகலெடுக்க முடியவில்லை. கைமுறையாக நகலெடுக்கவும்.", "కోడ్‌ను కాపీ చేయలేకపోయాము. దయచేసి మాన్యువల్‌గా కాపీ చేయండి."],
	"section.returns": ["Returns & Refunds", "वापसी और रिफ़ंड", "ਵਾਪਸੀ ਅਤੇ ਰਿਫੰਡ", "ফেরত ও রিফান্ড", "திருப்பி அனுப்புதல் மற்றும் பணத்திருப்பம்", "రిటర్న్‌లు మరియు రీఫండ్‌లు"],
	"section.help": ["Help & Support", "सहायता और समर्थन", "ਮਦਦ ਅਤੇ ਸਹਾਇਤਾ", "সাহায্য ও সহায়তা", "உதவி மற்றும் ஆதரவு", "సహాయం మరియు మద్దతు"],
	"addresses.title": ["My Addresses", "मेरे पते", "ਮੇਰੇ ਪਤੇ", "আমার ঠিকানা", "என் முகவரிகள்", "నా చిరునామాలు"],
	"addresses.save": ["Save address", "पता सहेजें", "ਪਤਾ ਸੰਭਾਲੋ", "ঠিকানা সংরক্ষণ করুন", "முகவரியைச் சேமி", "చిరునామాను సేవ్ చేయండి"],
	"addresses.description": ["Keep your permanent and order delivery addresses organized.", "अपने स्थायी और ऑर्डर डिलीवरी पते व्यवस्थित रखें।", "ਆਪਣੇ ਪੱਕੇ ਅਤੇ ਆਰਡਰ ਡਿਲੀਵਰੀ ਪਤੇ ਸੰਭਾਲ ਕੇ ਰੱਖੋ।", "আপনার স্থায়ী ও অর্ডার ডেলিভারির ঠিকানা গুছিয়ে রাখুন।", "உங்கள் நிரந்தர மற்றும் ஆர்டர் விநியோக முகவரிகளை ஒழுங்குபடுத்துங்கள்.", "మీ శాశ్వత మరియు ఆర్డర్ డెలివరీ చిరునామాలను క్రమబద్ధంగా ఉంచండి."],
	"addresses.permanentTitle": ["Permanent Address", "स्थायी पता", "ਪੱਕਾ ਪਤਾ", "স্থায়ী ঠিকানা", "நிரந்தர முகவரி", "శాశ్వత చిరునామా"],
	"addresses.permanentDescription": ["Your home or primary address", "आपका घर या मुख्य पता", "ਤੁਹਾਡਾ ਘਰ ਜਾਂ ਮੁੱਖ ਪਤਾ", "আপনার বাড়ি বা প্রধান ঠিকানা", "உங்கள் வீடு அல்லது முதன்மை முகவரி", "మీ ఇల్లు లేదా ప్రధాన చిరునామా"],
	"addresses.permanentTag": ["Permanent", "स्थायी", "ਪੱਕਾ", "স্থায়ী", "நிரந்தரம்", "శాశ్వతం"],
	"addresses.deliveryTitle": ["Order Delivery Address", "ऑर्डर डिलीवरी पता", "ਆਰਡਰ ਡਿਲੀਵਰੀ ਪਤਾ", "অর্ডার ডেলিভারির ঠিকানা", "ஆர்டர் விநியோக முகவரி", "ఆర్డర్ డెలివరీ చిరునామా"],
	"addresses.deliveryDescription": ["Where you want your orders delivered", "जहाँ आप अपने ऑर्डर मँगाना चाहते हैं", "ਜਿੱਥੇ ਤੁਸੀਂ ਆਪਣੇ ਆਰਡਰ ਮੰਗਵਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ", "যেখানে আপনি আপনার অর্ডার পেতে চান", "உங்கள் ஆர்டர்களைப் பெற விரும்பும் இடம்", "మీ ఆర్డర్‌లను పొందాలనుకునే ప్రదేశం"],
	"addresses.deliveryTag": ["Delivery", "डिलीवरी", "ਡਿਲੀਵਰੀ", "ডেলিভারি", "விநியோகம்", "డెలివరీ"],
	"setting.title": ["Settings", "सेटिंग्स", "ਸੈਟਿੰਗਾਂ", "সেটিংস", "அமைப்புகள்", "సెట్టింగ్‌లు"],
	"settings.save": ["Save settings", "सेटिंग्स सहेजें", "ਸੈਟਿੰਗਾਂ ਸੰਭਾਲੋ", "সেটিংস সংরক্ষণ করুন", "அமைப்புகளைச் சேமி", "సెట్టింగ్‌లను సేవ్ చేయండి"],
	"setting.languageLabel": ["Website language", "वेबसाइट की भाषा", "ਵੈੱਬਸਾਈਟ ਦੀ ਭਾਸ਼ਾ", "ওয়েবসাইটের ভাষা", "இணையதள மொழி", "వెబ్‌సైట్ భాష"],
	"setting.languageHelp": ["Choose a language to translate this page instantly.", "इस पेज को तुरंत अनुवाद करने के लिए भाषा चुनें।", "ਇਸ ਪੰਨੇ ਦਾ ਤੁਰੰਤ ਅਨੁਵਾਦ ਕਰਨ ਲਈ ਭਾਸ਼ਾ ਚੁਣੋ।", "এই পৃষ্ঠাটি সঙ্গে সঙ্গে অনুবাদ করতে একটি ভাষা বেছে নিন।", "இந்தப் பக்கத்தை உடனே மொழிபெயர்க்க ஒரு மொழியைத் தேர்ந்தெடுக்கவும்.", "ఈ పేజీని వెంటనే అనువదించడానికి భాషను ఎంచుకోండి."],
	"status.invalidPhoto": ["Please choose an image file.", "कृपया एक इमेज फ़ाइल चुनें।", "ਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਤਸਵੀਰ ਫ਼ਾਈਲ ਚੁਣੋ।", "অনুগ্রহ করে একটি ছবির ফাইল বেছে নিন।", "படக் கோப்பைத் தேர்ந்தெடுக்கவும்.", "దయచేసి ఒక చిత్ర ఫైల్‌ను ఎంచుకోండి."],
	"status.largePhoto": ["Choose an image smaller than 1 MB.", "1 MB से छोटी इमेज चुनें।", "1 MB ਤੋਂ ਛੋਟੀ ਤਸਵੀਰ ਚੁਣੋ।", "1 MB-এর চেয়ে ছোট ছবি বেছে নিন।", "1 MB-க்கு குறைவான படத்தைத் தேர்ந்தெடுக்கவும்.", "1 MB కంటే చిన్న చిత్రాన్ని ఎంచుకోండి."],
	"status.pageOnly": ["Changes are shown on this page only and will reset when you refresh.", "बदलाव केवल इस पेज पर दिखेंगे और रीफ़्रेश करने पर हट जाएँगे।", "ਤਬਦੀਲੀਆਂ ਸਿਰਫ਼ ਇਸ ਪੰਨੇ 'ਤੇ ਦਿਖਣਗੀਆਂ ਅਤੇ ਰੀਫ੍ਰੈਸ਼ ਕਰਨ 'ਤੇ ਹਟ ਜਾਣਗੀਆਂ।", "পরিবর্তন শুধু এই পৃষ্ঠায় দেখা যাবে এবং রিফ্রেশ করলে মুছে যাবে।", "மாற்றங்கள் இந்தப் பக்கத்தில் மட்டும் காட்டப்படும்; புதுப்பித்தால் மீட்டமைக்கப்படும்.", "మార్పులు ఈ పేజీలో మాత్రమే కనిపిస్తాయి; రిఫ్రెష్ చేస్తే తిరిగి మారతాయి."],
	"status.saved": ["Changes saved.", "बदलाव सहेज दिए गए।", "ਤਬਦੀਲੀਆਂ ਸੰਭਾਲੀਆਂ ਗਈਆਂ।", "পরিবর্তন সংরক্ষণ করা হয়েছে।", "மாற்றங்கள் சேமிக்கப்பட்டன.", "మార్పులు సేవ్ చేయబడ్డాయి."],
	"status.addressSaved": ["Address saved.", "पता सहेज दिया गया।", "ਪਤਾ ਸੰਭਾਲਿਆ ਗਿਆ।", "ঠিকানা সংরক্ষণ করা হয়েছে।", "முகவரி சேமிக்கப்பட்டது.", "చిరునామా சேవ్ చేయబడింది."],
	"status.settingsSaved": ["Settings saved.", "सेटिंग्स सहेजी गईं।", "ਸੈਟਿੰਗਾਂ ਸੰਭਾਲੀਆਂ ਗਈਆਂ।", "সেটিংস সংরক্ষণ করা হয়েছে।", "அமைப்புகள் சேமிக்கப்பட்டன.", "సెట్టింగ్‌లు సేవ్ చేయబడ్డాయి."]
};
let profileStatusKey = '';
let profilePhoto = '';
let customerSession = null;

window.VCartCloud.requireRole('customer').then((authorized) => {
	if (!authorized) window.location.replace('userlogin.html');
}).catch((error) => {
	console.error('Could not verify the customer session.', error);
	window.location.replace('userlogin.html');
});

try {
	customerSession = window.VCartSession.get();
	if (customerSession?.role === 'customer') {
		profileFields.name.value = customerSession.name || '';
		profileFields.email.value = customerSession.email || '';
		profileFields.mobile.value = customerSession.mobile || '';
		profileFields.gender.value = customerSession.gender || '';
		profileFields.dob.value = customerSession.dob || '';
		profileFields.address.value = customerSession.address || '';
		updateProfileHeader(profileFields.name.value);
		showProfilePhoto(customerSession.profilePhoto);

		const savedAddresses = window.VCartAccounts.getSection(customerSession.email, 'addresses');
		if (savedAddresses) {
			Object.entries(addressGroups).forEach(([groupName, fields]) => {
				Object.entries(fields).forEach(([fieldName, field]) => {
					field.value = savedAddresses[groupName]?.[fieldName] || '';
				});
			});
		}

		const savedSettings = window.VCartAccounts.getSection(customerSession.email, 'settings');
		if (savedSettings && languageCodes.includes(savedSettings.language)) {
			languageSelect.value = savedSettings.language;
		}
	}
} catch (error) {
	console.error('Could not load the saved customer details.', error);
}

function translate(key) {
	const languageIndex = languageCodes.indexOf(languageSelect.value);
	return translations[key]?.[languageIndex] ?? translations[key]?.[0] ?? key;
}

function setProfileStatus(key) {
	profileStatusKey = key;
	profileSaveStatus.textContent = key ? translate(key) : '';
}

function applyLanguage(language) {
	if (!languageCodes.includes(language)) return;
	languageSelect.value = language;
	document.documentElement.lang = language;
	document.querySelectorAll('[data-i18n]').forEach((element) => {
		element.textContent = translate(element.dataset.i18n);
	});
	document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
		element.placeholder = translate(element.dataset.i18nPlaceholder);
	});
	document.querySelectorAll('[data-i18n-alt]').forEach((element) => {
		element.alt = translate(element.dataset.i18nAlt);
	});
	setProfileStatus(profileStatusKey);
}

function getInitials(name) {
	return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
}

function showProfilePhoto(imageData) {
	profilePhoto = imageData || '';
	[profilePhotoImage, headerProfileImage].forEach((image) => {
		image.hidden = !profilePhoto;
		image.src = profilePhoto;
	});
}

function updateProfileHeader(name) {
	const initials = getInitials(name);
	document.getElementById('header-profile-name').textContent = name || 'Your profile';
	document.getElementById('header-profile-initials').textContent = initials;
	document.getElementById('profile-photo-initials').textContent = initials;
}

profilePhotoInput.addEventListener('change', () => {
	const [file] = profilePhotoInput.files;
	setProfileStatus('');
	if (!file) return;
	if (!file.type.startsWith('image/')) {
		setProfileStatus('status.invalidPhoto');
		profilePhotoInput.value = '';
		return;
	}
	if (file.size > 1024 * 1024) {
		setProfileStatus('status.largePhoto');
		profilePhotoInput.value = '';
		return;
	}

	const reader = new FileReader();
	reader.addEventListener('load', () => {
		if (typeof reader.result !== 'string') {
			alert('Could not read this image. Please try another file.');
			return;
		}

		showProfilePhoto(reader.result);
		setProfileStatus('');
	});
	reader.addEventListener('error', () => {
		console.error('Could not read the selected customer profile photo.');
		alert('Could not read this image. Please try another file.');
	});
	reader.readAsDataURL(file);
});

profileForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	try {
		if (!customerSession || customerSession.role !== 'customer' || !customerSession.email) {
			throw new Error('Log in to save profile changes.');
		}
		const profile = Object.fromEntries(
			Object.entries(profileFields).map(([name, field]) => [name, field.value.trim()])
		);
		profile.profilePhoto = profilePhoto;
		await window.VCartAccounts.updateProfile(customerSession.email, profile);
		customerSession = window.VCartSession.get();
		updateProfileHeader(profile.name);
		setProfileStatus('status.saved');
	} catch (error) {
		console.error('Could not save the customer profile.', error);
		alert(error.message === 'An account with this email or mobile number already exists.'
			? error.message
			: 'Could not save profile changes. Please check your details and Supabase connection, then try again.');
	}
});

Object.entries(addressGroups).forEach(([groupName, fields]) => {
	const button = document.getElementById(`save-${groupName}-address`);
	const status = document.getElementById(`${groupName}-address-status`);
	Object.values(fields).forEach((field) => {
		field.addEventListener('input', () => {
			status.textContent = '';
		});
		field.addEventListener('change', () => {
			status.textContent = '';
		});
	});
	button.addEventListener('click', async () => {
		try {
			if (!customerSession || customerSession.role !== 'customer' || !customerSession.email) {
				throw new Error('Log in to save address changes.');
			}
			const addresses = window.VCartAccounts.getSection(customerSession.email, 'addresses') || {};
			addresses[groupName] = Object.fromEntries(
				Object.entries(fields).map(([name, field]) => [name, field.value.trim()])
			);
			await window.VCartAccounts.saveSection(customerSession.email, 'addresses', addresses);
			status.textContent = translate('status.addressSaved');
		} catch (error) {
			console.error(`Could not save the ${groupName} address.`, error);
			alert('Could not save this address. Please check the Supabase connection and try again.');
		}
	});
});

document.getElementById('save-settings').addEventListener('click', async () => {
	try {
		if (!customerSession || customerSession.role !== 'customer' || !customerSession.email) {
			throw new Error('Log in to save settings.');
		}
		await window.VCartAccounts.saveSection(customerSession.email, 'settings', { language: languageSelect.value });
		document.getElementById('settings-save-status').textContent = translate('status.settingsSaved');
	} catch (error) {
		console.error('Could not save customer settings.', error);
		alert('Could not save settings. Please check the Supabase connection and try again.');
	}
});

Object.values(profileFields).forEach((field) => {
	field.addEventListener('input', () => setProfileStatus(''));
	field.addEventListener('change', () => setProfileStatus(''));
});

languageSelect.addEventListener('change', () => {
	document.getElementById('settings-save-status').textContent = '';
	applyLanguage(languageSelect.value);
});
applyLanguage(languageSelect.value);

function copyText(text) {
	if (navigator.clipboard?.writeText) {
		return navigator.clipboard.writeText(text);
	}

	const temporaryInput = document.createElement('textarea');
	temporaryInput.value = text;
	temporaryInput.setAttribute('readonly', '');
	temporaryInput.style.position = 'fixed';
	temporaryInput.style.opacity = '0';
	document.body.append(temporaryInput);
	temporaryInput.select();
	const copied = document.execCommand('copy');
	temporaryInput.remove();
	return copied ? Promise.resolve() : Promise.reject(new Error('Copy failed'));
}

document.querySelectorAll('.coupon-copy-button').forEach((button) => {
	button.addEventListener('click', async () => {
		const feedback = document.getElementById('coupon-feedback');
		try {
			await copyText(button.dataset.couponCode);
			feedback.dataset.i18n = 'offers.copied';
			feedback.textContent = translate('offers.copied');
		} catch (error) {
			feedback.dataset.i18n = 'offers.copyFailed';
			feedback.textContent = translate('offers.copyFailed');
		}
	});
});

function showSection(sectionId) {
	contentSections.forEach((section) => {
		const isActive = section.id === sectionId;
		section.classList.toggle('active', isActive);
		section.hidden = !isActive;
	});

	navLinks.forEach((link) => {
		const isActive = link.dataset.section === sectionId;
		link.classList.toggle('active', isActive);
		link.setAttribute('aria-pressed', String(isActive));
	});
}

navLinks.forEach((link) => {
	link.addEventListener('click', () => {
		showSection(link.dataset.section);
		window.history.replaceState(null, '', `#${link.dataset.section}`);
	});
});

const initialSection = window.location.hash.slice(1);
showSection(document.getElementById(initialSection) ? initialSection : 'dashboard');
