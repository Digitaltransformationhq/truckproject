import { useEffect, useState } from 'react';
import { APP_STRINGS } from './i18n-app';

/**
 * Lightweight translations: English text is the key; Hindi and Gujarati are looked up,
 * falling back to English for anything not translated yet. The choice is remembered per device.
 */
export type Lang = 'en' | 'hi' | 'gu';
export const LANGS: Array<{ code: Lang; label: string; name: string }> = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'hi', label: 'हिं', name: 'हिन्दी' },
  { code: 'gu', label: 'ગુ', name: 'ગુજરાતી' },
];
const STORE_KEY = 'fares24x7-lang';

type Entry = { hi: string; gu: string };
const D: Record<string, Entry> = {
  // Navigation and common actions
  'How it works': { hi: 'यह कैसे काम करता है', gu: 'તે કેવી રીતે કામ કરે છે' },
  'Platform': { hi: 'प्लेटफ़ॉर्म', gu: 'પ્લેટફોર્મ' },
  'About': { hi: 'हमारे बारे में', gu: 'અમારા વિશે' },
  'Log in': { hi: 'लॉग इन', gu: 'લૉગ ઇન' },
  'Sign up': { hi: 'साइन अप', gu: 'સાઇન અપ' },
  'Get started': { hi: 'शुरू करें', gu: 'શરૂ કરો' },
  'Create account': { hi: 'खाता बनाएँ', gu: 'ખાતું બનાવો' },
  'Continue': { hi: 'आगे बढ़ें', gu: 'આગળ વધો' },
  '← Back': { hi: '← पीछे', gu: '← પાછળ' },
  'Optional': { hi: 'वैकल्पिक', gu: 'વૈકલ્પિક' },
  'or': { hi: 'या', gu: 'અથવા' },
  'Language': { hi: 'भाषा', gu: 'ભાષા' },

  // Landing: hero and trust
  'Simple truck booking': { hi: 'आसान ट्रक बुकिंग', gu: 'સરળ ટ્રક બુકિંગ' },
  'Need a truck?': { hi: 'ट्रक चाहिए?', gu: 'ટ્રક જોઈએ છે?' },
  'Send one': { hi: 'बस एक', gu: 'બસ એક' },
  'request.': { hi: 'रिक्वेस्ट भेजें।', gu: 'વિનંતી મોકલો.' },
  'Customers post what they need. Truck owners review the request and either accept or reject it. That is the whole process.': {
    hi: 'ग्राहक बताते हैं कि उन्हें क्या चाहिए। ट्रक मालिक रिक्वेस्ट देखकर उसे स्वीकार या अस्वीकार करते हैं। बस, इतना ही।',
    gu: 'ગ્રાહકો જણાવે છે કે તેમને શું જોઈએ છે. ટ્રક માલિકો વિનંતી જોઈને તેને સ્વીકારે અથવા નકારે છે. બસ, આટલું જ.' },
  'See how it works': { hi: 'देखें यह कैसे काम करता है', gu: 'જુઓ તે કેવી રીતે કામ કરે છે' },
  'Verified businesses': { hi: 'सत्यापित व्यवसाय', gu: 'ચકાસાયેલા વ્યવસાયો' },
  'GST & PAN reviewed': { hi: 'GST और PAN की जाँच', gu: 'GST અને PAN ની ચકાસણી' },
  'Documented trucks': { hi: 'दस्तावेज़ों वाले ट्रक', gu: 'દસ્તાવેજો સાથેની ટ્રકો' },
  'RC, insurance & PUC': { hi: 'RC, बीमा और PUC', gu: 'RC, વીમો અને PUC' },
  'Direct contact': { hi: 'सीधा संपर्क', gu: 'સીધો સંપર્ક' },
  'No middlemen': { hi: 'कोई बिचौलिया नहीं', gu: 'કોઈ વચેટિયા નહીં' },

  // Landing: audience band
  'Built for Indian transport businesses': { hi: 'भारतीय परिवहन व्यवसायों के लिए बना', gu: 'ભારતીય પરિવહન વ્યવસાયો માટે બનાવેલ' },
  'Fleet owners': { hi: 'बेड़ा मालिक', gu: 'ફ્લીટ માલિકો' },
  'Fill empty return trips': { hi: 'खाली वापसी यात्राएँ भरें', gu: 'ખાલી પરત ફેરા ભરો' },
  'Load owners': { hi: 'माल मालिक', gu: 'માલ માલિકો' },
  'Book trucks without brokers': { hi: 'बिना दलाल के ट्रक बुक करें', gu: 'દલાલ વિના ટ્રક બુક કરો' },
  'Transporters': { hi: 'ट्रांसपोर्टर', gu: 'ટ્રાન્સપોર્ટરો' },
  'Put spare capacity to work': { hi: 'खाली क्षमता का उपयोग करें', gu: 'ખાલી ક્ષમતાનો ઉપયોગ કરો' },
  'Logistics teams': { hi: 'लॉजिस्टिक्स टीमें', gu: 'લોજિસ્ટિક્સ ટીમો' },
  'Track every load in one place': { hi: 'हर लोड एक ही जगह ट्रैक करें', gu: 'દરેક લોડ એક જ જગ્યાએ ટ્રૅક કરો' },

  // Landing: how it works
  'One request.': { hi: 'एक रिक्वेस्ट।', gu: 'એક વિનંતી.' },
  'One clear answer.': { hi: 'एक साफ़ जवाब।', gu: 'એક સ્પષ્ટ જવાબ.' },
  'From posting a load to a confirmed truck in three simple steps, for both customers and truck owners.': {
    hi: 'लोड पोस्ट करने से लेकर ट्रक पक्का होने तक, तीन आसान कदम, ग्राहकों और ट्रक मालिकों दोनों के लिए।',
    gu: 'લોડ પોસ્ટ કરવાથી લઈને ટ્રક નક્કી થવા સુધી, ત્રણ સરળ પગલાં, ગ્રાહકો અને ટ્રક માલિકો બંને માટે.' },
  'Post your load': { hi: 'अपना लोड पोस्ट करें', gu: 'તમારો લોડ પોસ્ટ કરો' },
  'Tell us the pickup city, delivery city, type of goods, weight and the date you need the truck.': {
    hi: 'पिकअप शहर, डिलीवरी शहर, माल का प्रकार, वज़न और ट्रक की तारीख़ बताएँ।',
    gu: 'પિકઅપ શહેર, ડિલિવરી શહેર, માલનો પ્રકાર, વજન અને ટ્રકની તારીખ જણાવો.' },
  'Full truck or shared (part) load': { hi: 'पूरा ट्रक या साझा (पार्ट) लोड', gu: 'આખી ટ્રક અથવા શેર (પાર્ટ) લોડ' },
  'Takes under a minute': { hi: 'एक मिनट से कम समय', gu: 'એક મિનિટથી ઓછો સમય' },
  'No phone calls needed': { hi: 'फ़ोन कॉल की ज़रूरत नहीं', gu: 'ફોન કૉલની જરૂર નથી' },
  'Matched with a truck': { hi: 'सही ट्रक से मिलान', gu: 'યોગ્ય ટ્રક સાથે મેળ' },
  'Truck owners with an available vehicle on your route are alerted and review your request.': {
    hi: 'आपके रूट पर उपलब्ध ट्रक वाले मालिकों को सूचना मिलती है और वे आपकी रिक्वेस्ट देखते हैं।',
    gu: 'તમારા રૂટ પર ઉપલબ્ધ ટ્રક ધરાવતા માલિકોને જાણ થાય છે અને તેઓ તમારી વિનંતી જુએ છે.' },
  'Transporters submit KYC documents': { hi: 'ट्रांसपोर्टर KYC दस्तावेज़ जमा करते हैं', gu: 'ટ્રાન્સપોર્ટરો KYC દસ્તાવેજો જમા કરે છે' },
  'Trucks already heading your way': { hi: 'ट्रक जो पहले से आपकी दिशा में जा रहे हैं', gu: 'તમારી દિશામાં પહેલેથી જતી ટ્રકો' },
  'Capacity checked automatically': { hi: 'क्षमता अपने-आप जाँची जाती है', gu: 'ક્ષમતા આપમેળે ચકાસાય છે' },
  'Confirmed and on the move': { hi: 'पक्का और रवाना', gu: 'નક્કી અને રવાના' },
  'The first owner to accept gets the trip. You are notified instantly and can see the assigned truck and contact.': {
    hi: 'जो मालिक पहले स्वीकार करता है, उसे ट्रिप मिलती है। आपको तुरंत सूचना मिलती है और ट्रक व संपर्क दिखता है।',
    gu: 'જે માલિક પહેલા સ્વીકારે તેને ટ્રિપ મળે છે. તમને તરત જાણ થાય છે અને ટ્રક તથા સંપર્ક દેખાય છે.' },
  'Instant confirmation': { hi: 'तुरंत पुष्टि', gu: 'તરત પુષ્ટિ' },
  'Truck and owner details shared': { hi: 'ट्रक और मालिक की जानकारी साझा', gu: 'ટ્રક અને માલિકની વિગતો શેર' },
  'Empty return trips become paid trips': { hi: 'खाली वापसी यात्राएँ कमाई वाली बनती हैं', gu: 'ખાલી પરત ફેરા કમાણીવાળા બને છે' },

  // Landing: platform
  'One clear workspace': { hi: 'एक साफ़ वर्कस्पेस', gu: 'એક સ્પષ્ટ વર્કસ્પેસ' },
  'Post, review and respond.': { hi: 'पोस्ट करें, देखें और जवाब दें।', gu: 'પોસ્ટ કરો, જુઓ અને જવાબ આપો.' },
  'Fares24x7 keeps truck requests in one simple view so customers and truck owners always know what happens next.': {
    hi: 'Fares24x7 सभी ट्रक रिक्वेस्ट एक आसान स्क्रीन पर रखता है, ताकि ग्राहक और ट्रक मालिक हमेशा जानें कि आगे क्या होगा।',
    gu: 'Fares24x7 બધી ટ્રક વિનંતીઓ એક સરળ સ્ક્રીન પર રાખે છે, જેથી ગ્રાહકો અને ટ્રક માલિકો હંમેશા જાણે કે આગળ શું થશે.' },
  'Simple truck request form': { hi: 'आसान ट्रक रिक्वेस्ट फ़ॉर्म', gu: 'સરળ ટ્રક વિનંતી ફોર્મ' },
  'Instant owner notification': { hi: 'मालिक को तुरंत सूचना', gu: 'માલિકને તરત જાણ' },
  'Clear accept or reject response': { hi: 'साफ़ स्वीकार या अस्वीकार जवाब', gu: 'સ્પષ્ટ સ્વીકાર કે અસ્વીકાર જવાબ' },
  'Explore the platform': { hi: 'प्लेटफ़ॉर्म देखें', gu: 'પ્લેટફોર્મ જુઓ' },

  // Landing: about
  'About Fares24x7': { hi: 'Fares24x7 के बारे में', gu: 'Fares24x7 વિશે' },
  'No truck should': { hi: 'कोई ट्रक', gu: 'કોઈ ટ્રક' },
  'return empty.': { hi: 'खाली न लौटे।', gu: 'ખાલી પાછી ન ફરે.' },
  'The problem': { hi: 'समस्या', gu: 'સમસ્યા' },
  'Across India, thousands of trucks finish a delivery and drive back empty, burning fuel and earning nothing. Businesses on that same route struggle to find a reliable truck at a fair price.': {
    hi: 'पूरे भारत में हज़ारों ट्रक डिलीवरी के बाद खाली लौटते हैं, ईंधन जलाते हैं और कुछ नहीं कमाते। उसी रूट पर व्यवसायों को सही दाम पर भरोसेमंद ट्रक नहीं मिलता।',
    gu: 'આખા ભારતમાં હજારો ટ્રકો ડિલિવરી પછી ખાલી પાછી ફરે છે, બળતણ બાળે છે અને કંઈ કમાતી નથી. એ જ રૂટ પર વ્યવસાયોને યોગ્ય ભાવે ભરોસાપાત્ર ટ્રક મળતી નથી.' },
  'What we do': { hi: 'हम क्या करते हैं', gu: 'અમે શું કરીએ છીએ' },
  'Fares24x7 connects the two. Businesses post their loads, truck owners already heading that way accept them, and an empty return becomes a paid trip.': {
    hi: 'Fares24x7 दोनों को जोड़ता है। व्यवसाय अपना लोड पोस्ट करते हैं, उसी दिशा में जा रहे ट्रक मालिक उसे स्वीकार करते हैं, और खाली वापसी कमाई वाली ट्रिप बन जाती है।',
    gu: 'Fares24x7 બંનેને જોડે છે. વ્યવસાયો પોતાનો લોડ પોસ્ટ કરે છે, એ જ દિશામાં જતા ટ્રક માલિકો તેને સ્વીકારે છે, અને ખાલી પરત ફેરો કમાણીવાળી ટ્રિપ બની જાય છે.' },
  'Verified network': { hi: 'सत्यापित नेटवर्क', gu: 'ચકાસાયેલ નેટવર્ક' },
  'Businesses pass GST and PAN checks. Every truck carries RC, insurance, fitness and PUC documents.': {
    hi: 'व्यवसायों की GST और PAN जाँच होती है। हर ट्रक के RC, बीमा, फ़िटनेस और PUC दस्तावेज़ होते हैं।',
    gu: 'વ્યવસાયોની GST અને PAN ચકાસણી થાય છે. દરેક ટ્રક પાસે RC, વીમો, ફિટનેસ અને PUC દસ્તાવેજો હોય છે.' },
  'Built for return loads': { hi: 'वापसी लोड के लिए बना', gu: 'પરત લોડ માટે બનાવેલ' },
  'Requests reach owners whose trucks are already near the pickup or heading to the destination.': {
    hi: 'रिक्वेस्ट उन मालिकों तक पहुँचती है जिनके ट्रक पिकअप के पास हैं या मंज़िल की ओर जा रहे हैं।',
    gu: 'વિનંતી એવા માલિકો સુધી પહોંચે છે જેમની ટ્રકો પિકઅપ પાસે છે અથવા મંજિલ તરફ જઈ રહી છે.' },
  'Simple by design': { hi: 'सरल डिज़ाइन', gu: 'સરળ ડિઝાઇન' },
  'One request, one clear answer. No middlemen and no endless phone calls.': {
    hi: 'एक रिक्वेस्ट, एक साफ़ जवाब। न बिचौलिए, न अनगिनत फ़ोन कॉल।',
    gu: 'એક વિનંતી, એક સ્પષ્ટ જવાબ. ન વચેટિયા, ન અગણિત ફોન કૉલ.' },
  'Ready to move your goods?': { hi: 'अपना माल भेजने के लिए तैयार?', gu: 'તમારો માલ મોકલવા તૈયાર છો?' },
  'Post your first truck request.': { hi: 'अपनी पहली ट्रक रिक्वेस्ट पोस्ट करें।', gu: 'તમારી પહેલી ટ્રક વિનંતી પોસ્ટ કરો.' },

  // Footer
  'Simple truck requests for Indian transport businesses. Post a load, get a clear answer, move.': {
    hi: 'भारतीय परिवहन व्यवसायों के लिए आसान ट्रक रिक्वेस्ट। लोड पोस्ट करें, साफ़ जवाब पाएँ, आगे बढ़ें।',
    gu: 'ભારતીય પરિવહન વ્યવસાયો માટે સરળ ટ્રક વિનંતી. લોડ પોસ્ટ કરો, સ્પષ્ટ જવાબ મેળવો, આગળ વધો.' },
  'Product': { hi: 'प्रोडक्ट', gu: 'પ્રોડક્ટ' },
  'I need trucks': { hi: 'मुझे ट्रक चाहिए', gu: 'મારે ટ્રક જોઈએ છે' },
  'I own trucks': { hi: 'मेरे पास ट्रक हैं', gu: 'મારી પાસે ટ્રકો છે' },
  'Company': { hi: 'कंपनी', gu: 'કંપની' },
  'Contact': { hi: 'संपर्क', gu: 'સંપર્ક' },
  'Privacy Policy': { hi: 'गोपनीयता नीति', gu: 'ગોપનીયતા નીતિ' },
  'Terms of Service': { hi: 'सेवा की शर्तें', gu: 'સેવાની શરતો' },
  '© 2026 Fares24x7. All rights reserved.': { hi: '© 2026 Fares24x7. सर्वाधिकार सुरक्षित।', gu: '© 2026 Fares24x7. સર્વાધિકાર સુરક્ષિત.' },
  'Built in India for Indian transport businesses': { hi: 'भारत में, भारतीय परिवहन व्यवसायों के लिए बना', gu: 'ભારતમાં, ભારતીય પરિવહન વ્યવસાયો માટે બનાવેલ' },
  'Back to top': { hi: 'ऊपर जाएँ', gu: 'ઉપર જાઓ' },

  'Questions': { hi: 'सवाल', gu: 'પ્રશ્નો' },
  'Frequently asked questions': { hi: 'अक्सर पूछे जाने वाले सवाल', gu: 'વારંવાર પૂછાતા પ્રશ્નો' },
  'Everything about booking trucks and finding return loads on Fares24x7.': { hi: 'Fares24x7 पर ट्रक बुक करने और वापसी लोड पाने के बारे में सब कुछ।', gu: 'Fares24x7 પર ટ્રક બુક કરવા અને પરત લોડ મેળવવા વિશે બધું.' },
  'See popular truck routes': { hi: 'लोकप्रिय ट्रक रूट देखें', gu: 'લોકપ્રિય ટ્રક રૂટ જુઓ' },
  'Truck routes': { hi: 'ट्रक रूट', gu: 'ટ્રક રૂટ' },
  'FAQ': { hi: 'सवाल-जवाब', gu: 'પ્રશ્નોત્તરી' },
  'How do I book a truck on Fares24x7?': { hi: 'Fares24x7 पर ट्रक कैसे बुक करें?', gu: 'Fares24x7 પર ટ્રક કેવી રીતે બુક કરવી?' },
  'Is Fares24x7 a transport broker?': { hi: 'क्या Fares24x7 एक ट्रांसपोर्ट दलाल है?', gu: 'શું Fares24x7 ટ્રાન્સપોર્ટ દલાલ છે?' },
  'How are truck owners and businesses verified?': { hi: 'ट्रक मालिकों और व्यवसायों का सत्यापन कैसे होता है?', gu: 'ટ્રક માલિકો અને વ્યવસાયોની ચકાસણી કેવી રીતે થાય છે?' },
  'What are return loads?': { hi: 'वापसी लोड क्या होते हैं?', gu: 'પરત લોડ શું છે?' },
  'Can I book a full truck or a part load?': { hi: 'क्या मैं पूरा ट्रक या पार्ट लोड बुक कर सकता हूँ?', gu: 'શું હું આખી ટ્રક કે પાર્ટ લોડ બુક કરી શકું?' },
  'How do I know my goods were delivered?': { hi: 'मुझे कैसे पता चलेगा कि माल पहुँच गया?', gu: 'મને કેવી રીતે ખબર પડશે કે માલ પહોંચી ગયો?' },

  // Login / sign-up
  'Welcome back': { hi: 'फिर से स्वागत है', gu: 'ફરી સ્વાગત છે' },
  'Log in to Fares24x7': { hi: 'Fares24x7 में लॉग इन करें', gu: 'Fares24x7 માં લૉગ ઇન કરો' },
  'Enter your details to access your operations workspace.': { hi: 'अपने वर्कस्पेस में जाने के लिए अपनी जानकारी डालें।', gu: 'તમારા વર્કસ્પેસમાં જવા માટે તમારી વિગતો દાખલ કરો.' },
  'Email address': { hi: 'ईमेल पता', gu: 'ઇમેઇલ સરનામું' },
  'Password': { hi: 'पासवर्ड', gu: 'પાસવર્ડ' },
  'Enter your password': { hi: 'अपना पासवर्ड डालें', gu: 'તમારો પાસવર્ડ દાખલ કરો' },
  'Minimum 8 characters': { hi: 'कम से कम 8 अक्षर', gu: 'ઓછામાં ઓછા 8 અક્ષર' },
  'Show': { hi: 'दिखाएँ', gu: 'બતાવો' },
  'Hide': { hi: 'छिपाएँ', gu: 'છુપાવો' },
  'Keep me signed in': { hi: 'मुझे लॉग इन रखें', gu: 'મને લૉગ ઇન રાખો' },
  'Forgot password?': { hi: 'पासवर्ड भूल गए?', gu: 'પાસવર્ડ ભૂલી ગયા?' },
  'Log in to workspace': { hi: 'वर्कस्पेस में लॉग इन करें', gu: 'વર્કસ્પેસમાં લૉગ ઇન કરો' },
  'Logging in…': { hi: 'लॉग इन हो रहा है…', gu: 'લૉગ ઇન થઈ રહ્યું છે…' },
  'or continue with': { hi: 'या इससे जारी रखें', gu: 'અથવા આનાથી આગળ વધો' },
  'Continue with Google': { hi: 'Google के साथ जारी रखें', gu: 'Google સાથે આગળ વધો' },
  'Sign up with Google': { hi: 'Google से साइन अप करें', gu: 'Google થી સાઇન અપ કરો' },
  'New to Fares24x7?': { hi: 'Fares24x7 पर नए हैं?', gu: 'Fares24x7 પર નવા છો?' },
  'Create an account': { hi: 'खाता बनाएँ', gu: 'ખાતું બનાવો' },
  'Already have an account?': { hi: 'पहले से खाता है?', gu: 'પહેલેથી ખાતું છે?' },
  'Secure access': { hi: 'सुरक्षित पहुँच', gu: 'સુરક્ષિત ઍક્સેસ' },
  'Choose account type': { hi: 'खाते का प्रकार चुनें', gu: 'ખાતાનો પ્રકાર પસંદ કરો' },
  'How will you use Fares24x7?': { hi: 'आप Fares24x7 का उपयोग कैसे करेंगे?', gu: 'તમે Fares24x7 નો ઉપયોગ કેવી રીતે કરશો?' },
  'Your selection personalises the workspace and questions.': { hi: 'आपकी पसंद के अनुसार वर्कस्पेस और सवाल तय होंगे।', gu: 'તમારી પસંદગી મુજબ વર્કસ્પેસ અને પ્રશ્નો નક્કી થશે.' },
  'Load Owner / Shipper': { hi: 'माल मालिक / शिपर', gu: 'માલ માલિક / શિપર' },
  'Post loads and find suitable vehicles': { hi: 'लोड पोस्ट करें और सही गाड़ी पाएँ', gu: 'લોડ પોસ્ટ કરો અને યોગ્ય વાહન શોધો' },
  'I own or manage trucks': { hi: 'मेरे पास ट्रक हैं या मैं उन्हें चलाता हूँ', gu: 'મારી પાસે ટ્રકો છે અથવા હું તેનું સંચાલન કરું છું' },
  'Truck Owner / Transporter': { hi: 'ट्रक मालिक / ट्रांसपोर्टर', gu: 'ટ્રક માલિક / ટ્રાન્સપોર્ટર' },
  'Add vehicles and find return loads': { hi: 'गाड़ियाँ जोड़ें और वापसी लोड पाएँ', gu: 'વાહનો ઉમેરો અને પરત લોડ શોધો' },
  'Your account': { hi: 'आपका खाता', gu: 'તમારું ખાતું' },
  'Tell us about yourself': { hi: 'अपने बारे में बताएँ', gu: 'તમારા વિશે જણાવો' },
  'These details create your secure business account.': { hi: 'इन जानकारियों से आपका सुरक्षित व्यावसायिक खाता बनेगा।', gu: 'આ વિગતોથી તમારું સુરક્ષિત વ્યવસાયિક ખાતું બનશે.' },
  'Business details': { hi: 'व्यवसाय की जानकारी', gu: 'વ્યવસાયની વિગતો' },
  'Tell us about your loads': { hi: 'अपने लोड के बारे में बताएँ', gu: 'તમારા લોડ વિશે જણાવો' },
  'Tell us about your fleet': { hi: 'अपने ट्रकों के बारे में बताएँ', gu: 'તમારી ટ્રકો વિશે જણાવો' },
  'After signing up, verify your business from the Overview page.': { hi: 'साइन अप के बाद, सारांश पेज से अपना व्यवसाय सत्यापित करें।', gu: 'સાઇન અપ પછી, સારાંશ પેજ પરથી તમારો વ્યવસાય ચકાસો.' },
  'First name': { hi: 'पहला नाम', gu: 'પ્રથમ નામ' },
  'Last name': { hi: 'उपनाम', gu: 'અટક' },
  'Business name': { hi: 'व्यवसाय का नाम', gu: 'વ્યવસાયનું નામ' },
  'Phone number': { hi: 'फ़ोन नंबर', gu: 'ફોન નંબર' },
  'Primary city': { hi: 'मुख्य शहर', gu: 'મુખ્ય શહેર' },
  'Industry type': { hi: 'उद्योग का प्रकार', gu: 'ઉદ્યોગનો પ્રકાર' },
  'Select industry': { hi: 'उद्योग चुनें', gu: 'ઉદ્યોગ પસંદ કરો' },
  'Typical material': { hi: 'आम तौर पर माल', gu: 'સામાન્ય માલ' },
  'Loads per month': { hi: 'हर महीने लोड', gu: 'દર મહિને લોડ' },
  'Select range': { hi: 'सीमा चुनें', gu: 'શ્રેણી પસંદ કરો' },
  'Primary pickup city': { hi: 'मुख्य पिकअप शहर', gu: 'મુખ્ય પિકઅપ શહેર' },
  'Fleet size': { hi: 'ट्रकों की संख्या', gu: 'ટ્રકોની સંખ્યા' },
  'Primary vehicle type': { hi: 'मुख्य वाहन प्रकार', gu: 'મુખ્ય વાહન પ્રકાર' },
  'Select vehicle': { hi: 'वाहन चुनें', gu: 'વાહન પસંદ કરો' },
  'Operating cities': { hi: 'संचालन वाले शहर', gu: 'કામગીરીનાં શહેરો' },
  'Preferred return routes': { hi: 'पसंदीदा वापसी रूट', gu: 'પસંદગીના પરત રૂટ' },
  'I agree to the': { hi: 'मैं सहमत हूँ', gu: 'હું સંમત છું' },
  'Terms': { hi: 'शर्तों', gu: 'શરતો' },
  'and': { hi: 'और', gu: 'અને' },
  'Creating account…': { hi: 'खाता बन रहा है…', gu: 'ખાતું બની રહ્યું છે…' },
  'Return logistics, simplified': { hi: 'वापसी लॉजिस्टिक्स, आसान', gu: 'પરત લોજિસ્ટિક્સ, સરળ' },
  'Log in to your': { hi: 'अपने', gu: 'તમારા' },
  'dashboard.': { hi: 'डैशबोर्ड में लॉग इन करें।', gu: 'ડેશબોર્ડમાં લૉગ ઇન કરો.' },
  'Your trips are': { hi: 'आपकी ट्रिप्स', gu: 'તમારી ટ્રિપ્સ' },
  'waiting.': { hi: 'इंतज़ार में हैं।', gu: 'રાહ જોઈ રહી છે.' },
  'Welcome back,': { hi: 'फिर से स्वागत है,', gu: 'ફરી સ્વાગત છે,' },
  'partner.': { hi: 'साथी।', gu: 'સાથી.' },
  'Create your': { hi: 'अपना', gu: 'તમારું' },
  'account.': { hi: 'खाता बनाएँ।', gu: 'ખાતું બનાવો.' },
  'Start getting': { hi: 'पाना शुरू करें', gu: 'મેળવવાનું શરૂ કરો' },
  'return loads.': { hi: 'वापसी लोड।', gu: 'પરત લોડ.' },
  'Your trucks,': { hi: 'आपके ट्रक,', gu: 'તમારી ટ્રકો,' },
  'always earning.': { hi: 'हमेशा कमाई में।', gu: 'હંમેશા કમાણીમાં.' },
  'Signed in': { hi: 'लॉग इन हो गया', gu: 'લૉગ ઇન થયું' },
  'Signing in': { hi: 'लॉग इन हो रहा है', gu: 'લૉગ ઇન થઈ રહ્યું છે' },
  'Created': { hi: 'बन गया', gu: 'બની ગયું' },
  'Creating': { hi: 'बन रहा है', gu: 'બની રહ્યું છે' },

  // App menu
  'Control centre': { hi: 'नियंत्रण केंद्र', gu: 'નિયંત્રણ કેન્દ્ર' },
  'Analytics': { hi: 'विश्लेषण', gu: 'વિશ્લેષણ' },
  'User accounts': { hi: 'उपयोगकर्ता खाते', gu: 'વપરાશકર્તા ખાતાં' },
  'KYC verification': { hi: 'KYC सत्यापन', gu: 'KYC ચકાસણી' },
  'Operations': { hi: 'संचालन', gu: 'કામગીરી' },
  'Support requests': { hi: 'सहायता अनुरोध', gu: 'સહાય વિનંતીઓ' },
  'Overview': { hi: 'सारांश', gu: 'સારાંશ' },
  'My requests': { hi: 'मेरी रिक्वेस्ट', gu: 'મારી વિનંતીઓ' },
  'Truck requests': { hi: 'ट्रक रिक्वेस्ट', gu: 'ટ્રક વિનંતીઓ' },
  'My vehicles': { hi: 'मेरे वाहन', gu: 'મારાં વાહનો' },
  'My drivers': { hi: 'मेरे ड्राइवर', gu: 'મારા ડ્રાઇવરો' },
  'Business profile': { hi: 'व्यवसाय प्रोफ़ाइल', gu: 'વ્યવસાય પ્રોફાઇલ' },
  'Support': { hi: 'सहायता', gu: 'સહાય' },
  'Main menu': { hi: 'मुख्य मेनू', gu: 'મુખ્ય મેનુ' },
  'Account': { hi: 'खाता', gu: 'ખાતું' },
  'Home': { hi: 'होम', gu: 'હોમ' },
  'Requests': { hi: 'रिक्वेस्ट', gu: 'વિનંતીઓ' },
  'Vehicles': { hi: 'वाहन', gu: 'વાહનો' },
  'Drivers': { hi: 'ड्राइवर', gu: 'ડ્રાઇવરો' },
  'Profile': { hi: 'प्रोफ़ाइल', gu: 'પ્રોફાઇલ' },
  'Accounts': { hi: 'खाते', gu: 'ખાતાં' },
  'KYC': { hi: 'KYC', gu: 'KYC' },
  'Sign out': { hi: 'लॉग आउट', gu: 'લૉગ આઉટ' },
};

// --- Store -------------------------------------------------------------------
const listeners = new Set<(lang: Lang) => void>();
const read = (): Lang => {
  // A shared link like ?lang=hi wins and is remembered.
  const fromUrl = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('lang') : null;
  if (fromUrl === 'hi' || fromUrl === 'gu' || fromUrl === 'en') { try { localStorage.setItem(STORE_KEY, fromUrl); } catch { /* ignore */ } return fromUrl; }
  try { const value = localStorage.getItem(STORE_KEY); return value === 'hi' || value === 'gu' ? value : 'en'; } catch { return 'en'; }
};
let current: Lang = typeof window === 'undefined' ? 'en' : read();
const FONT_URL: Partial<Record<Lang, string>> = {
  hi: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700;800&display=swap',
  gu: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;600;700;800&display=swap',
};
const apply = (lang: Lang) => {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  // Load the Hindi / Gujarati font only when that language is chosen, so English pages stay light.
  const href = FONT_URL[lang];
  if (href && !document.querySelector(`link[data-lang-font="${lang}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = href; link.dataset.langFont = lang;
    document.head.appendChild(link);
  }
};
apply(current);

export function setLang(lang: Lang) {
  current = lang;
  try { localStorage.setItem(STORE_KEY, lang); } catch { /* storage unavailable */ }
  apply(lang);
  listeners.forEach((listener) => listener(lang));
}

export const translate = (lang: Lang, text: string) => {
  if (lang === 'en') return text;
  const fromLanding = D[text]?.[lang];
  if (fromLanding) return fromLanding;
  const fromApp = APP_STRINGS[text];
  return fromApp ? fromApp[lang === 'hi' ? 0 : 1] : text;
};
const hasTranslation = (text: string) => Boolean(D[text] || APP_STRINGS[text]);

// --- Whole-interface translation ----------------------------------------------
// Translates every visible text, placeholder, title and aria-label on the page, including content React
// renders later (dialogs, toasts). User data (names, cities, numbers) never matches the dictionary, so it is
// left alone. Switching back to English restores the original text.
const SKIP = 'script,style,noscript,textarea,input,[contenteditable],[data-no-translate],.sf-board';
const ATTRS = ['placeholder', 'title', 'aria-label'] as const;
const textOriginal = new Map<Text, string>();
const textWritten = new WeakMap<Text, string>();
const attrOriginal = new Map<Element, Map<string, string>>();
const attrWritten = new WeakMap<Element, Map<string, string>>();
let observer: MutationObserver | null = null;

const split = (value: string) => { const core = value.trim(); const lead = value.slice(0, value.indexOf(core)); return { core, lead, trail: value.slice(lead.length + core.length) }; };

function translateTextNode(node: Text) {
  const parent = node.parentElement;
  if (!parent || parent.closest(SKIP)) return;
  if (textWritten.get(node) !== node.data) textOriginal.set(node, node.data);
  const original = textOriginal.get(node) ?? node.data;
  const { core, lead, trail } = split(original);
  if (!core || !hasTranslation(core)) return;
  const next = lead + translate(current, core) + trail;
  if (node.data !== next) { textWritten.set(node, next); node.data = next; }
}

function translateAttrs(el: Element) {
  if (el.closest(SKIP) && !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
  for (const name of ATTRS) {
    const value = el.getAttribute(name);
    if (value === null) continue;
    const written = attrWritten.get(el)?.get(name);
    if (written !== value) { const map = attrOriginal.get(el) ?? new Map(); map.set(name, value); attrOriginal.set(el, map); }
    const original = attrOriginal.get(el)?.get(name) ?? value;
    if (!hasTranslation(original.trim())) continue;
    const next = translate(current, original.trim());
    if (value !== next) {
      const map = attrWritten.get(el) ?? new Map(); map.set(name, next); attrWritten.set(el, map);
      el.setAttribute(name, next);
    }
  }
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) { translateTextNode(root as Text); return; }
  if (!(root instanceof Element)) return;
  translateAttrs(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text); else translateAttrs(node as Element);
  }
}

function startDomTranslation() {
  if (observer || typeof document === 'undefined' || !document.body) return;
  walk(document.body);
  observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') translateTextNode(record.target as Text);
      else if (record.type === 'attributes') translateAttrs(record.target as Element);
      else record.addedNodes.forEach(walk);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
}

function stopDomTranslation() {
  observer?.disconnect();
  observer = null;
  textOriginal.forEach((original, node) => { if (node.isConnected && textWritten.get(node) === node.data) node.data = original; });
  attrOriginal.forEach((map, el) => { if (!el.isConnected) return; map.forEach((original, name) => { if (attrWritten.get(el)?.get(name) === el.getAttribute(name)) el.setAttribute(name, original); }); });
  textOriginal.clear(); attrOriginal.clear();
}

function syncDomTranslation() {
  stopDomTranslation();
  if (current !== 'en') startDomTranslation();
}
if (typeof window !== 'undefined') {
  listeners.add(() => syncDomTranslation());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncDomTranslation, { once: true });
  else queueMicrotask(syncDomTranslation);
}

/** Current language plus a `t(englishText)` translator; re-renders when the language changes. */
export function useT() {
  const [lang, setState] = useState<Lang>(current);
  useEffect(() => { listeners.add(setState); return () => { listeners.delete(setState); }; }, []);
  return { lang, t: (text: string) => translate(lang, text) };
}

/** EN · हिं · ગુ switcher. */
export function LanguageSwitcher({ className = '', variant = 'compact' }: { className?: string; variant?: 'compact' | 'list' }) {
  const { lang } = useT();
  if (variant === 'list') return <div className={`lang-list ${className}`} role="group" aria-label="Language / भाषा / ભાષા" data-no-translate>
    {LANGS.map((item) => <button key={item.code} type="button" lang={item.code} className={lang === item.code ? 'active' : ''} aria-pressed={lang === item.code} onClick={() => setLang(item.code)}><b>{item.label}</b>{item.name}{lang === item.code && <i aria-hidden="true">✓</i>}</button>)}
  </div>;
  return <div className={`lang-switch ${className}`} role="group" aria-label="Language / भाषा / ભાષા" data-no-translate>
    {LANGS.map((item) => <button key={item.code} type="button" lang={item.code} className={lang === item.code ? 'active' : ''} aria-pressed={lang === item.code} title={item.name} onClick={() => setLang(item.code)}>{item.label}</button>)}
  </div>;
}
