# InternovaYZ

InternovaYZ, Bursa Teknik Üniversitesi öğrencilerinin staj ve kariyer gelişim süreçlerini tek bir platformda toplayan, bu süreçlerin önemli bir bölümünü yapay zeka ile otomatikleştiren bir web uygulamasıdır. Platform; öğrenci, şirket ve akademisyen olmak üzere üç farklı kullanıcı rolünü aynı ekosistemde buluşturur. Öğrenci bu ekosistemin merkezindedir; şirketler staj ve proje fırsatı sağlar, akademisyenler ise süreci yönlendirir ve onaylar.

## Genel Bakış

Projenin temel amacı, öğrencinin gelişim yolculuğunu uçtan uca desteklemektir. Öğrenci platform üzerinde özgeçmişini ve portfolyosunu oluşturur, staj ilanlarına başvurur, staj defterini tutar, sertifikalarını doğrular, becerilerini ölçer, kariyer hedeflerine göre yol haritası çıkarır ve proje takımlarına katılır. Bu süreçlerin birçoğunda klasik yöntemlerin yarattığı zaman kaybı ve belirsizlik, yapay zeka destekli özelliklerle ortadan kaldırılır.

Şirketler platform üzerinden staj ilanı açar, ilana özel bir beceri profili tanımlar, gelen başvuruları yönetir ve yapay zeka tarafından üretilen aday-pozisyon uyum sıralamasından yararlanır. Akademisyenler ise öğrencilerin staj evraklarını inceler, onaylar ve süreci denetler.

## Çözülen Problemler

Geleneksel staj sürecinde öğrenciler staj defterini genellikle son güne bırakır ve uzun bir raporu kısa sürede yazmaya çalışır. InternovaYZ, öğrencinin her gün yazdığı kısa ham notları yapay zeka ile akademik bir dile dönüştürerek bu yükü hafifletir.

Öğrenciler çoğu zaman hangi yetkinlikleri kazanmaları gerektiğini bilmez. Platform, öğrencinin mevcut beceri profilini hedeflediği pozisyonla karşılaştırır, eksikleri ortaya koyar ve bunları kapatmak için somut adımlar önerir.

Üniversite ile sanayi arasındaki kopukluk, şirketlerin doğru öğrenciye, öğrencilerin de doğru fırsata ulaşamamasına yol açar. Platform, ilan açma ve başvuru süreçlerini tek bir yerde toplayarak bu iki tarafı birbirine bağlar.

Proje yapmak isteyen öğrenciler ekip kurmakta zorlanır. Platform, beceri eşleştirmesine dayalı bir takım kurma ortamı sunar. Ayrıca sertifika doğrulama gibi manuel ve zaman alan işler, optik karakter tanıma ve resmi doğrulama servisleriyle otomatikleştirilir; staj yönetmeliği gibi dağınık bilgilere ise yapay zeka asistanı üzerinden anında erişilir.

## Kullanıcı Rolleri

Öğrenci rolü ekosistemin merkezindedir. Öğrenci; profil ve özgeçmiş yönetimi, staj defteri, sertifika ve beceri takibi, kariyer haritası, staj hazırlık değerlendirmesi ve proje takımları gibi modüllerin tamamını kullanır.

Şirket rolü fırsat sağlayan taraftır. Şirket; staj ilanı açar, ilana özel beceri profili tanımlar, başvuruları durumlarına göre yönetir, yapay zeka destekli aday sıralamasından yararlanır ve başvuruları toplu olarak işleyebilir.

Akademisyen rolü yönlendirici ve onaylayıcı taraftır. Akademisyen; öğrencileri takip eder, staj evraklarını içeren onay kuyruğunu yönetir, onayladığı belgeleri görüntüler ve süreci denetler.

## Mimari

Uygulama üç ana katmandan oluşur. Önyüz katmanı React ile geliştirilmiş tek sayfa uygulamasıdır ve kullanıcının gördüğü tüm arayüzü barındırır. Arka uç katmanı FastAPI ile yazılmış REST tabanlı bir servistir; iş kurallarını, kimlik doğrulamayı ve yetkilendirmeyi yürütür. Veri katmanı ise kalıcı verinin tutulduğu PostgreSQL veritabanı ile önbellek, oturum ve hız sınırlama amacıyla kullanılan Redis sunucusundan oluşur.

Bu katmanların yanında, yapay zeka işlevlerini yürüten ayrı bir servis grubu bulunur. Bu servisler dil modeli sağlayıcılarına, optik karakter tanıma araçlarına ve dış doğrulama kaynaklarına bağlanarak arka uç tarafından çağrılır.

Tüm bileşenler Docker Compose ile bir arada çalışacak biçimde paketlenmiştir. Tek bir komutla veritabanı, önbellek sunucusu, arka uç ve önyüz aynı anda ayağa kalkar. Arka uç açılışında veritabanı şeması Alembic ile otomatik olarak güncellenir.

## Teknoloji Yığını

Önyüz tarafında React tabanlı bir tek sayfa uygulaması kullanılır. Sayfa yönlendirmesi React Router ile yapılır ve role göre korunan rotalar tanımlanır. Arayüz tasarımı Tailwind CSS ile geliştirilmiştir. Grafikler ve yetkinlik radarları için Recharts kullanılır. Arka uca yapılan istekler Axios üzerinden gerçekleştirilir ve kimlik doğrulama bilgisi her isteğe otomatik eklenir. Grup sohbeti için tarayıcı ile sunucu arasında WebSocket bağlantısı kurulur. Oturum ve global durum yönetimi React Context yapısı ile sağlanır.

Arka uç tarafında Python dili ve FastAPI çerçevesi kullanılır. Veritabanı erişimi SQLAlchemy nesne ilişkisel eşleme katmanı ile yapılır. Şema değişiklikleri Alembic ile sürümlenir. Gelen ve giden verilerin doğrulanması Pydantic ile yapılır. Kimlik doğrulama, JSON Web Token tabanlıdır ve token üretimi için python-jose kullanılır. Parolalar bcrypt ile güvenli biçimde özetlenir. İstek hız sınırlaması SlowAPI ve Redis ile sağlanır. Gerçek zamanlı sohbet, FastAPI üzerindeki WebSocket uç noktası ile gerçekleştirilir.

Yapay zeka tarafında birincil dil modeli olarak Google Gemini kullanılır. Kesintisiz çalışma için Groq ve OpenAI yedek sağlayıcı olarak tanımlanmıştır; birincil sağlayıcı yanıt veremediğinde diğerlerine geçilir. Yönetmelik sorularını yanıtlamak için bir bilgi getirme ve üretme yaklaşımı uygulanır; yönetmelik metni parçalara bölünür, soruyla ilgili parça seçilir ve dil modeli bu parçaya dayanarak yanıt üretir. Öğrenci ile takım arasındaki beceri eşleştirmesi scikit-learn kütüphanesindeki terim frekansı ağırlıklandırması ve kosinüs benzerliği ile hesaplanır. Sertifika belgelerinden metin çıkarmak için PyMuPDF ve Tesseract optik karakter tanıma aracı kullanılır. BTK Akademi sertifikalarının resmi doğrulaması, ilgili web sitesi üzerinde Playwright ile yapılır. GitHub depolarının analizi GitHub REST arabirimi ile yapılır; depo içeriği çekilir ve dil modeli ile teknoloji yığını ve katkı dağılımı çıkarılır.

Veri ve dağıtım tarafında ana ilişkisel veritabanı olarak PostgreSQL, önbellek ve oturum deposu olarak Redis kullanılır. Servisler Docker ve Docker Compose ile konteyner haline getirilir. Üretim ortamında ters vekil sunucu olarak Nginx kullanılması öngörülür. Sürekli tümleştirme ve dağıtım için GitHub Actions kullanılır. Sürüm kontrolü Git ve GitHub üzerinden yürütülür.

## Modüller

### Ana Sayfa ve Üyelik

Ana sayfa, platformu tanıtan bir karşılama ekranı ve temel özelliklerin özetlendiği kartlardan oluşur. Üyelik ekranında kullanıcı öğrenci, şirket veya akademisyen olarak kayıt olabilir. Giriş ve kayıt formlarında alan doğrulaması yapılır. Başarılı girişte kullanıcıya bir kimlik belirteci verilir ve kullanıcı rolüne uygun panele yönlendirilir.

### Öğrenci Paneli

Öğrenci paneli, öğrencinin kontrol merkezidir. Üst bölümde yüz puan üzerinden hesaplanan bir staj hazırlık skoru halka biçiminde gösterilir. Bunun altında toplam başvuru, bekleyen başvuru, kabul edilen başvuru ve günlük rapor sayısını gösteren istatistik kartları yer alır. Son başvurular listesinde her başvurunun durumu, başvurudan sonuca uzanan aşamalı bir ilerleme çizgisiyle gösterilir. Panelde ayrıca tüm modüllere tek tıkla erişim sağlayan hızlı işlem bağlantıları ve kısa bir profil özeti bulunur.

### Staj İlanları ve İlan Detayı

Öğrenci, açık staj ilanlarını listeleyebilir ve filtreleyebilir. İlan detay sayfasında ilanın açıklaması, gereksinimleri ve tarihleri yer alır. Bu sayfanın en önemli bölümü, öğrencinin beceri profili ile ilanın gereksinimlerini karşılaştıran uyum analizidir. Analiz, bir uyum yüzdesi, kategori bazında karşılaştırma ve yapay zeka tarafından üretilen bir yorum içerir. Ayrıca eksik yetkinlikleri kapatmaya yönelik somut adımlar, şirketin yapay zeka ile çıkarılmış ön analizi, mülakat hazırlık kontrol listesi ve tek tıkla üretilebilen bir ön yazı sunulur.

### Staj Defteri

Staj defteri modülü platformun öne çıkan özelliğidir. Öğrenci günlük sekmesinde her gün için bir iki cümlelik ham not girer. Yapay zeka bu ham notu akademik bir dile dönüştürür ve öğrenci ham metin ile akademik metni yan yana görebilir. Haftalık sekmesinde yapay zeka tarafından üretilen haftalık özet yer alır. Beceriler sekmesinde, girilen metinlerden otomatik olarak çıkarılan beceriler ve bunların güven düzeyi gösterilir. Evraklar sekmesi ise staj sürecine ait belgelerin yönetimini sağlar.

### Staj Hazırlık ve Kariyer Haritası

Staj hazırlık modülü, öğrencinin genel hazırlık skorunu ve bu skoru oluşturan alt kategori puanlarını gösterir. Puan kazandıracak gelişim önerileri, öğrencinin profiline uygun sektör önerileri ve genel bir alan profili sunulur. Kariyer haritası modülünde öğrenci bir hedef şirket seçer ve bu hedefe ulaşmak için kişiselleştirilmiş bir yol haritası alır. Aynı modülde beceri radarı, eksik yetkinlik analizi ve kaynak katkı analizi yer alır.

### Kariyer Asistanı

Kariyer asistanı, bilgi getirme ve üretme yaklaşımıyla çalışan bir sohbet modülüdür. Genel modda öğrenci Bursa Teknik Üniversitesi staj yönetmeliğiyle ilgili sorular sorabilir ve ilgili yönetmelik bölümüne dayanan yanıtlar alır. Staj modunda ise belirli bir staja özel, bağlam farkında bir sohbet yürütülür. Modülde sık sorulan sorular ve popüler konular için hızlı erişim bağlantıları bulunur; her mod için sohbet geçmişi ayrı tutulur.

### Profil, Özgeçmiş ve Sertifikalar

Profil modülünde öğrenci kişisel ve akademik bilgilerini düzenler ve özgeçmişini oluşturur. Sertifikalar sekmesinde öğrenci sertifika numarasını girerek resmi doğrulama yapabilir; belgeler optik karakter tanıma ile okunur ve BTK Akademi üzerinden doğrulanır. Projeler sekmesinde öğrenci GitHub depo bağlantısı ekleyebilir ve yapay zeka deponun teknoloji yığınını ve katkı dağılımını otomatik olarak çıkarır. Yetenekler sekmesinde ise öğrenci beceri etiketlerini yönetir.

### Projeler ve Takımlar

Projeler modülünde öğrenci açık projeleri keşfedebilir, arayabilir ve kendisine önerilen projeleri görebilir. Öneriler, beceri eşleştirmesine dayanır. Öğrenci kendi grubunu kurabilir, grup içinde gerçek zamanlı sohbet edebilir, proje detaylarını ve departmanları görüntüleyebilir ve bir departmana başvurabilir. Gruplara katılım talepleri bir onay akışıyla yönetilir.

### Şirket Paneli

Şirket paneli, şirketin staj ilanlarını ve başvurularını yönettiği ekrandır. Şirket yeni bir ilan oluştururken pozisyon, departman ve sıfırdan yüze kadar değer alan bir beceri profili tanımlar. Gelen başvurular durumlarına göre listelenir ve durumlar arasında izin verilen geçişlerle yönetilir. Yapay zeka, başvuran adayları ilanla olan uyumlarına göre sıralar. Şirket başvuruları toplu olarak da işleyebilir.

### Akademisyen Paneli

Akademisyen paneli, öğrencilerin staj evraklarının incelendiği ekrandır. Bekleyen evraklar bir onay kuyruğunda toplanır; akademisyen bu belgeleri inceleyip onaylar ve onaylanmış belgeleri görüntüleyebilir. Panel ayrıca öğrenci takibi ve genel istatistikler sunar.

## Yapay Zeka Servisleri

Arka uçta, yapay zeka işlevlerini yürüten bir dizi servis bulunur. Bu servisler şu işleri kapsar: staj defteri ham metnini akademik metne dönüştürme, haftalık günlük özeti üretme, özgeçmiş metninden beceri çıkarma, eksik yetkinlik analizi, yönetmelik üzerinde bilgi getirme ve üretme yaklaşımıyla soru yanıtlama, sektör keşfi ve önerisi, optik karakter tanıma ve resmi doğrulama ile sertifika kontrolü, GitHub deposu ve katkı analizi, beceri eşleştirmesine dayalı takım önerisi, aday-pozisyon uyum sıralaması, ön yazı üretimi ve mülakat hazırlık kontrol listesi oluşturma.

## Veritabanı Modeli

Veri modeli, kullanıcılar ve rolleri merkeze alacak şekilde tasarlanmıştır. Başlıca varlıklar şunlardır: kullanıcılar, staj ilanları, başvurular ve başvuru durum geçmişi, özgeçmişler, sertifikalar, portfolyolar, staj defteri günlükleri, proje takımları ve takım üyeleri, takım başvuruları, yol haritaları, beceri etiketleri ve kullanıcı becerileri, gruplar ve grup üyelikleri, grup katılım istekleri, grup mesajları, projeler ve proje departmanları, departman başvuruları, staj deneyimleri ve staj evrakları. Bu varlıklar arasındaki ilişkiler SQLAlchemy ile tanımlanır ve şema değişiklikleri Alembic göçleriyle yönetilir.

## API Yapısı

Arka uç, sorumluluk alanlarına göre ayrılmış yönlendiricilerden oluşur. Başlıca yönlendiriciler kimlik doğrulama, kullanıcılar, staj ilanları, başvurular, şirketler, özgeçmiş, portfolyolar, sertifikalar, staj defteri, takımlar, kariyer, yapay zeka, gruplar, projeler, beceriler, keşfet, gerçek zamanlı sohbet, staj ve evraklar konularını kapsar. Uygulama ayrıca veritabanı bağlantısını kontrol eden bir sağlık denetimi uç noktası sunar ve yüklenen belgeleri statik olarak sunar. API arayüzü FastAPI tarafından otomatik üretilen etkileşimli dokümantasyon ile incelenebilir.

## Kurulum ve Çalıştırma

Önerilen yöntem Docker Compose ile çalıştırmaktır. Bunun için sisteminizde Docker ve Docker Compose kurulu olmalıdır. Önce arka uç dizinindeki ortam değişkenleri dosyası örnekten kopyalanır ve değerleri doldurulur. Ardından proje kök dizininde tek bir komutla tüm servisler ayağa kaldırılır.

Ortam dosyasını hazırlamak için arka uç dizininde örnek dosya kopyalanır:

```
cd backend
cp .env.example .env
```

Daha sonra proje kök dizininde servisler başlatılır:

```
docker compose up --build
```

Bu komut PostgreSQL, Redis, arka uç ve önyüz servislerini başlatır. Arka uç açılışında veritabanı göçleri otomatik uygulanır. Servisler ayağa kalktığında önyüze tarayıcıdan üç bininci kapı üzerinden, arka uca ise sekiz bin ikinci kapı üzerinden erişilir.

Docker kullanmadan elle çalıştırmak isterseniz, arka uç için bir Python sanal ortamı oluşturup bağımlılıkları kurmanız, çalışan bir PostgreSQL ve Redis örneğine bağlanmanız, göçleri uygulamanız ve uygulamayı bir ASGI sunucusu ile başlatmanız gerekir. Önyüz için ise düğüm bağımlılıklarını kurup geliştirme sunucusunu başlatmanız yeterlidir.

## Klasör Yapısı

Proje iki ana bölümden oluşur. Arka uç bölümü uygulamanın giriş noktasını, veritabanı modellerini, yönlendiricileri, yapay zeka servislerini, göç dosyalarını ve yüklenen belgeleri içerir. Önyüz bölümü ise sayfaları, yeniden kullanılabilir bileşenleri, arka uçla iletişim kuran servis katmanını ve oturum yönetimini içeren bağlam yapısını barındırır. Proje kök dizininde ayrıca tüm servisleri bir arada tanımlayan Docker Compose dosyası bulunur.

## Notlar

Yapay zeka özellikleri dış sağlayıcılara bağlı olduğundan, ilgili anahtarlar tanımlanmadan bu özellikler tam olarak çalışmaz. Geliştirme ve test ortamında bu durum uygulamanın çalışmasını engellemez; yalnızca yapay zeka çıktıları yerine açıklayıcı uyarılar döner. Veritabanı üzerinde doğrudan sorgu yapmak gerektiğinde, çalışan PostgreSQL konteynerine bağlanılarak standart SQL sorguları çalıştırılabilir. Veriyi değiştiren işlemlerden önce salt okunur sorgularla doğrulama yapılması önerilir.
