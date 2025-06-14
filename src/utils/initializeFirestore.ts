import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  setDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Initialize Firestore with sample data
export const initializeFirestore = async () => {
  try {
    console.log('Initializing Firestore collections...');
    
    await Promise.all([
      initializeGothenburgRewards(),
      // Remove test user initialization to avoid permission issues
      // initializeAdminUser(),
      // initializeTestUser()
    ]);
    
    console.log('Firestore initialization completed successfully!');
  } catch (error) {
    console.error('Error initializing Firestore:', error);
  }
};

// Initialize Gothenburg rewards - NEW PRICING STRUCTURE
export const initializeGothenburgRewards = async () => {
  try {
    // Check if rewards already exist
    const rewardsRef = collection(db, 'rewards');
    const existingRewards = await getDocs(rewardsRef);
    
    if (existingRewards.size > 0) {
      console.log('Rewards already exist, skipping initialization');
      return;
    }

    const rewards = [
      {
        title: {
          "sv": "Västtrafik Månadskort",
          "so": "Baaskii bishii Västtrafik", 
          "ar": "بطاقة Västtrafik الشهرية",
          "es": "Pase mensual Västtrafik",
          "en": "Västtrafik Monthly Pass"
        },
        description: {
          "sv": "Gratis månadskort för buss, spårvagn och båt i Göteborg (värde 890 kr)",
          "so": "Baaskii bilaash ah oo bishi ah oo loogu talagalay bas, tareen iyo doon Göteborg (qiimaha 890 kr)",
          "ar": "بطاقة شهرية مجانية للحافلات والترام والقوارب في غوتنبرغ (قيمة 890 كرونة)", 
          "es": "Pase mensual gratuito para autobús, tranvía y barco en Gotemburgo (valor 890 kr)",
          "en": "Free monthly pass for bus, tram and boat in Gothenburg (value 890 kr)"
        },
        cost: 25, // NEW PRICE
        icon_name: 'train',
        available: true,
        inventory_count: 20,
        created_at: serverTimestamp()
      },
      {
        title: {
          "sv": "Göteborgs Rabattkupong",
          "so": "Kooban qiimo dhimis ah Göteborg",
          "ar": "قسيمة خصم غوتنبرغ", 
          "es": "Cupón de descuento de Gotemburgo",
          "en": "Gothenburg Discount Voucher"
        },
        description: {
          "sv": "500 kr rabattkupong för shopping och restauranger i Göteborg centrum",
          "so": "500 kr kooban qiimo dhimis ah oo loogu talagalay wax iibsiga iyo maqaayada xarunta Göteborg",
          "ar": "قسيمة خصم 500 كرونة للتسوق والمطاعم في وسط غوتنبرغ",
          "es": "Cupón de descuento de 500 kr para compras y restaurantes en el centro de Gotemburgo", 
          "en": "500 kr discount voucher for shopping and restaurants in Gothenburg city center"
        },
        cost: 30, // NEW PRICE
        icon_name: 'shopping-bag',
        available: true,
        inventory_count: 30,
        created_at: serverTimestamp()
      },
      {
        title: {
          "sv": "Liseberg Entrébiljett",
          "so": "Tikit galitaanka Liseberg",
          "ar": "تذكرة دخول Liseberg",
          "es": "Entrada a Liseberg",
          "en": "Liseberg Entry Ticket"
        },
        description: {
          "sv": "Gratis entrébiljett till Liseberg nöjespark (värde 495 kr)",
          "so": "Tikit galitaan bilaash ah Liseberg madadaalo park (qiimaha 495 kr)",
          "ar": "تذكرة دخول مجانية لمدينة ملاهي ليسبرغ (قيمة 495 كرونة)",
          "es": "Entrada gratuita al parque de atracciones Liseberg (valor 495 kr)",
          "en": "Free entry ticket to Liseberg amusement park (value 495 kr)"
        },
        cost: 40, // NEW PRICE
        icon_name: 'gift',
        available: true,
        inventory_count: 25,
        created_at: serverTimestamp()
      },
      {
        title: {
          "sv": "Göteborgs Konstmuseum",
          "so": "Matxafka farshaxanka Göteborg",
          "ar": "متحف غوتنبرغ للفنون",
          "es": "Museo de Arte de Gotemburgo", 
          "en": "Gothenburg Museum of Art"
        },
        description: {
          "sv": "Gratis inträde + guidning på Göteborgs Konstmuseum för 2 personer",
          "so": "Galitaan bilaash ah + hage matxafka farshaxanka Göteborg 2 qof",
          "ar": "دخول مجاني + جولة إرشادية في متحف غوتنبرغ للفنون لشخصين",
          "es": "Entrada gratuita + visita guiada al Museo de Arte de Gotemburgo para 2 personas",
          "en": "Free entry + guided tour at Gothenburg Museum of Art for 2 people"
        },
        cost: 50, // NEW PRICE
        icon_name: 'building',
        available: true,
        inventory_count: 15,
        created_at: serverTimestamp()
      },
      {
        title: {
          "sv": "Göteborgs Skärgård Båttur",
          "so": "Safar doon ah Göteborg archipelago",
          "ar": "رحلة بالقارب في أرخبيل غوتنبرغ",
          "es": "Excursión en barco por el archipiélago de Gotemburgo",
          "en": "Gothenburg Archipelago Boat Trip"
        },
        description: {
          "sv": "Heldagstur till Göteborgs vackra skärgård med Styrsöbolaget",
          "so": "Safar maalin dhan ah oo aadaya jasiiradaha quruxda badan ee Göteborg Styrsöbolaget",
          "ar": "رحلة يوم كامل إلى أرخبيل غوتنبرغ الجميل مع Styrsöbolaget",
          "es": "Excursión de día completo al hermoso archipiélago de Gotemburgo con Styrsöbolaget",
          "en": "Full day trip to Gothenburg's beautiful archipelago with Styrsöbolaget"
        },
        cost: 60, // NEW PRICE
        icon_name: 'leaf',
        available: true,
        inventory_count: 10,
        created_at: serverTimestamp()
      },
      {
        title: {
          "sv": "Restaurang Voucher",
          "so": "Kooban maqaayad",
          "ar": "قسيمة مطعم",
          "es": "Vale de restaurante",
          "en": "Restaurant Voucher"
        },
        description: {
          "sv": "500 kr att spendera på utvalda restauranger i Göteborg centrum",
          "so": "500 kr oo lagu kharash gareyn karo maqaayado la doortay oo ku yaal xarunta Göteborg",
          "ar": "500 كرونة للإنفاق في مطاعم مختارة في وسط غوتنبرغ",
          "es": "500 kr para gastar en restaurantes seleccionados en el centro de Gotemburgo",
          "en": "500 kr to spend at selected restaurants in Gothenburg city center"
        },
        cost: 60, // NEW PRICE
        icon_name: 'coffee',
        available: true,
        inventory_count: 40,
        created_at: serverTimestamp()
      }
    ];

    for (const reward of rewards) {
      await addDoc(rewardsRef, reward);
    }

    console.log('✅ Gothenburg rewards initialized successfully! New pricing: 25-60 points.');
  } catch (error) {
    console.error('❌ Error initializing rewards:', error);
  }
};

// Force refresh rewards (for manual trigger)
export const forceRefreshRewards = async () => {
  try {
    // Clear existing rewards first
    const rewardsRef = collection(db, 'rewards');
    const existingRewards = await getDocs(rewardsRef);
    
    // Delete all existing rewards
    for (const docSnap of existingRewards.docs) {
      await deleteDoc(doc(db, 'rewards', docSnap.id));
    }
    
    console.log('✅ Cleared existing rewards');

    // Add new rewards
    await initializeGothenburgRewards();
    
    console.log('✅ Rewards refreshed successfully!');
  } catch (error) {
    console.error('❌ Error refreshing rewards:', error);
  }
};

// Utility function to check if collections are empty
export const checkCollectionsStatus = async () => {
  try {
    const collections = ['users', 'issues', 'points', 'rewards', 'redemptions'];
    const status: Record<string, number> = {};
    
    for (const collectionName of collections) {
      const snapshot = await getDocs(collection(db, collectionName));
      status[collectionName] = snapshot.size;
    }
    
    console.log('📊 Collections status:', status);
    return status;
  } catch (error) {
    console.error('Error checking collections status:', error);
    return {};
  }
};

// Function to seed sample issues (for development/testing)
export const seedSampleIssues = async () => {
  try {
    const sampleIssues = [
      {
        title: 'Stort hål i vägen på Avenyn',
        description: 'Det finns ett djupt hål i vägen som kan skada bilar och cyklar. Behöver åtgärdas snabbt för säkerheten.',
        type: 'pothole',
        location_lat: 57.7089,
        location_lng: 11.9746,
        location_address: 'Kungsportsavenyn 45, Göteborg',
        status: 'confirmed',
        user_id: null, // Anonymous report
        image_url: null,
        is_valid_submission: true,
        validated_by: 'ai',
        points_awarded: 0,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      },
      {
        title: 'Trasig gatubelysning vid Liseberg',
        description: 'Gatulampan fungerar inte, gör området mörkt och osäkert på kvällarna. Behöver bytas ut.',
        type: 'streetlight',
        location_lat: 57.6956,
        location_lng: 11.9929,
        location_address: 'Örgrytevägen 5, Göteborg',
        status: 'confirmed',
        user_id: null, // Anonymous for now
        image_url: null,
        is_valid_submission: true,
        validated_by: 'ai',
        points_awarded: 0,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      },
      {
        title: 'Klotter på busshållplats Brunnsparken',
        description: 'Omfattande klotter på busshållplatsen som behöver rengöras. Påverkar områdets utseende negativt.',
        type: 'graffiti',
        location_lat: 57.7065,
        location_lng: 11.9670,
        location_address: 'Brunnsparken, Göteborg',
        status: 'in_progress',
        user_id: null, // Anonymous for now
        image_url: null,
        is_valid_submission: true,
        validated_by: 'ai',
        points_awarded: 0,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      }
    ];

    const issuesRef = collection(db, 'issues');
    
    for (const issue of sampleIssues) {
      await addDoc(issuesRef, issue);
    }

    console.log('✅ Sample Gothenburg issues seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding sample issues:', error);
  }
};