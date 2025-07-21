import * as admin from 'firebase-admin';

// 한국 식품첨가물 데이터 (식품의약품안전처 기준)
const additiveData = [
  {
    id: 'sodium-benzoate',
    name: '안식향산나트륨',
    hazard_level: 'medium',
    description_short: '보존료로 사용되는 화학 첨가물',
    description_full:
      '안식향산나트륨은 식품의 부패를 방지하는 보존료입니다. 일반적으로 안전하다고 여겨지지만, 비타민 C와 반응해 벤젠이 생성될 수 있고 일부 연구에서는 어린이 과다활동과의 연관성도 제기되었습니다.',
    aliases: ['안식향산나트륨', '벤조산나트륨']
  },
  {
    id: 'aspartame',
    name: '아스파탐',
    hazard_level: 'high',
    description_short: '제로 칼로리 인공 감미료',
    description_full:
      '아스파탐은 설탕보다 약 200배 더 단맛을 내는 인공 감미료입니다. PKU 환자는 섭취하면 안 되며, WHO 산하 IARC에서 발암 가능 물질(2B)로 분류했습니다.',
    aliases: ['아스파탐', '뉴트라스위트', '이퀄']
  },
  {
    id: 'msg',
    name: '글루탐산나트륨',
    hazard_level: 'medium',
    description_short: '감칠맛을 내는 조미료',
    description_full:
      '글루탐산나트륨(MSG)은 국물·스낵류에 감칠맛(우마미)을 부여합니다. 대부분 안전하다고 평가되지만, 민감한 일부 사람은 두통·얼굴 화끈거림 등의 “MSG 증후군”을 겪을 수 있습니다.',
    aliases: ['글루탐산나트륨', '미원', '조미료']
  },
  {
    id: 'citric-acid',
    name: '구연산',
    hazard_level: 'low',
    description_short: '산미료 및 보존료',
    description_full:
      '구연산은 과일에 자연 존재하는 유기산으로, 신맛을 내고 pH를 낮춰 미생물 증식을 억제합니다. 일반적으로 안전하며 화장품·세척제에도 쓰입니다.',
    aliases: ['구연산']
  },
  {
    id: 'red-dye-40',
    name: '적색 40호',
    hazard_level: 'high',
    description_short: '인공 식용색소',
    description_full:
      '적색 40호(알루라레드)는 사탕·음료에 선명한 붉은색을 내지만, 일부 연구에서 어린이 과잉행동 가능성이 지적돼 EU는 경고 문구를 의무화하고 있습니다.',
    aliases: ['적색40호', '알루라레드']
  },
  {
    id: 'carrageenan',
    name: '카라기난',
    hazard_level: 'medium',
    description_short: '해조류 유래 증점제',
    description_full:
      '카라기난은 홍조류에서 추출한 천연 다당류로, 유제품·식물성 음료의 점성을 높입니다. 동물 장염모델에서 염증 보고가 있어 민감자는 주의가 필요합니다.',
    aliases: ['카라기난']
  },
  {
    id: 'bha',
    name: 'BHA',
    hazard_level: 'high',
    description_short: '합성 산화방지제',
    description_full:
      'BHA(부틸화히드록시아니솔)는 유지류 산패를 막지만 고용량 투여 동물실험에서 발암 가능성이 보고되었습니다. 식품에서는 0.02% 이하로 제한됩니다.',
    aliases: ['부틸화히드록시아니솔']
  },
  {
    id: 'sodium-nitrite',
    name: '아질산나트륨',
    hazard_level: 'high',
    description_short: '육가공품 발색·보존료',
    description_full:
      '아질산나트륨은 햄·베이컨 색을 선홍색으로 고정하고 클로스트리디움 보툴리눔을 억제합니다. 고온 조리 시 니트로사민(발암성) 생성 우려가 있어 사용량이 엄격히 제한됩니다.',
    aliases: ['아질산나트륨']
  },
  {
    id: 'high-fructose-corn-syrup',
    name: '과당포도당액',
    hazard_level: 'medium',
    description_short: '액상 옥수수 감미료',
    description_full:
      '과당포도당액(HFCS)은 청량음료·소스 등에 널리 사용됩니다. 과다 섭취 시 비만·지방간·인슐린 저항성 위험이 증가할 수 있습니다.',
    aliases: ['과당포도당액', '콘시럽']
  },
  {
    id: 'lecithin',
    name: '레시틴',
    hazard_level: 'low',
    description_short: '천연 유화제',
    description_full:
      '레시틴은 콩·해바라기 등에서 추출한 인지질로 초콜릿의 유동성 개선, 마가린 분리 방지 등에 쓰입니다. 대두 유래일 경우 콩 알레르기 표기가 필요합니다.',
    aliases: ['레시틴', '대두레시틴', '해바라기레시틴']
  },

  /* ========== 추가 55종 샘플 ========== */
  /* --- 보존료 --- */
  {
    id: 'potassium-benzoate',
    name: '안식향산칼륨',
    hazard_level: 'medium',
    description_short: '저염·다이어트 음료용 보존료',
    description_full:
      '안식향산칼륨은 나트륨 함량을 줄이기 위해 탄산음료, 과즙 제품에 사용되는 벤조산계 보존료입니다.',
    aliases: ['안식향산칼륨']
  },
  {
    id: 'calcium-benzoate',
    name: '안식향산칼슘',
    hazard_level: 'medium',
    description_short: '벤조산계 보존료',
    description_full:
      '안식향산칼슘은 빵·간장·주스에 쓰이며 벤조산나트륨과 유사한 항균 효과를 냅니다.',
    aliases: ['안식향산칼슘']
  },
  {
    id: 'sodium-sulfite',
    name: '아황산나트륨',
    hazard_level: 'high',
    description_short: '아황산염 보존·표백제',
    description_full:
      '아황산나트륨은 건과일·와인의 갈변을 방지하지만, 5~10%의 천식 환자에게 천식 발작을 유발할 수 있어 라벨에 “아황산류 함유” 표시가 필수입니다.',
    aliases: ['아황산나트륨']
  },
  {
    id: 'potassium-metabisulfite',
    name: '메타중아황산칼륨',
    hazard_level: 'high',
    description_short: '와인·과일 보존용 아황산염',
    description_full:
      '메타중아황산칼륨은 발효·과일 보존에 쓰이며 아황산 SO₂를 방출해 미생물 성장을 억제합니다. 천식·알레르기 반응에 주의가 필요합니다.',
    aliases: ['메타중아황산칼륨']
  },
  {
    id: 'potassium-nitrate',
    name: '질산칼륨',
    hazard_level: 'high',
    description_short: '육류 염지용 질산염',
    description_full:
      '질산칼륨은 건조햄·살라미 등에 쓰이며 체내에서 아질산염으로 환원되어 발색·보존 효과를 냅니다.',
    aliases: ['질산칼륨']
  },
  {
    id: 'sorbic-acid',
    name: '소르빈산',
    hazard_level: 'low',
    description_short: '천연 유래 곰팡이 억제제',
    description_full:
      '소르빈산은 치즈·제과류에서 곰팡이와 효모 증식을 억제하며, 인체 내에서 CO₂와 물로 분해되는 비교적 안전한 보존료입니다.',
    aliases: ['소르빈산']
  },
  {
    id: 'calcium-propionate',
    name: '프로피온산칼슘',
    hazard_level: 'low',
    description_short: '빵 곰팡이 방지제',
    description_full:
      '프로피온산칼슘은 제빵류의 곰팡이·로프균을 억제합니다. 인체에서 빠르게 대사되어 안전하지만, 일부 연구에서 어린이 행동 변화가 논의되고 있습니다.',
    aliases: ['프로피온산칼슘']
  },
  {
    id: 'sodium-propionate',
    name: '프로피온산나트륨',
    hazard_level: 'low',
    description_short: '제과·케이크용 보존료',
    description_full:
      '프로피온산나트륨은 케이크·피자 크러스트 등 화학팽창 제과류에 사용되어 곰팡이 발생을 억제합니다.',
    aliases: ['프로피온산나트륨']
  },

  /* --- 유화제 --- */
  {
    id: 'e471',
    name: '모노·디글리세리드',
    hazard_level: 'low',
    description_short: '지방산 모노·디글리세리드 유화제',
    description_full:
      '모노·디글리세리드는 식빵 부드러움 유지, 아이스크림 기포 안정 등에 쓰이며 체내에서 지방과 글리세롤로 분해되어 안전성이 높습니다.',
    aliases: ['모노글리세리드', '디글리세리드']
  },
  {
    id: 'polysorbate-80',
    name: '폴리소르베이트 80',
    hazard_level: 'medium',
    description_short: '아이스크림용 합성 유화제',
    description_full:
      '폴리소르베이트 80은 유지방 방울을 미세화해 아이스크림의 크리미함과 융해 저항성을 높이지만, 대장 점막 투과성 증가 연구도 있어 논란이 있습니다.',
    aliases: ['폴리소르베이트80']
  },
  {
    id: 'pgpr',
    name: 'PGPR',
    hazard_level: 'low',
    description_short: '초콜릿 점도 감소제',
    description_full:
      'PGPR(폴리글리세롤 폴리리시놀레산)은 초콜릿 제조 시 점도를 낮춰 몰딩성을 개선하며, 저용량 사용 시 안전성이 입증되었습니다.',
    aliases: ['PGPR', '폴리글리세롤폴리리시놀레산']
  },

  /* --- 안정·점증제 --- */
  {
    id: 'guar-gum',
    name: '구아검',
    hazard_level: 'low',
    description_short: '식물성 점증제',
    description_full:
      '구아검은 구아콩에서 얻는 다당류로, 물과 만나 강한 점성을 형성해 아이스크림·면류에 탄력을 부여합니다.',
    aliases: ['구아검']
  },
  {
    id: 'xanthan-gum',
    name: '잔탄검',
    hazard_level: 'low',
    description_short: '발효 유래 점증제',
    description_full:
      '잔탄검은 박테리아 발효로 생산되며 소스·드레싱 점도를 안정화합니다. 글루텐프리 제빵에서 구조를 보강하는 데 필수적입니다.',
    aliases: ['잔탄검']
  },
  {
    id: 'agar',
    name: '아가',
    hazard_level: 'low',
    description_short: '해조 유래 겔화제',
    description_full:
      '아가(한천)는 해조류에서 추출한 천연 젤화제로, 베지터리언 젤리·푸딩 제조에 사용됩니다.',
    aliases: ['한천', '아가']
  },

  /* --- 식감개선 --- */
  {
    id: 'cmc',
    name: '카복시메틸셀룰로스',
    hazard_level: 'medium',
    description_short: '셀룰로스계 증점제',
    description_full:
      'CMC는 아이스크림·소스의 점도를 높이고 수분을 유지합니다. 최근 장내 미생물 다양성 감소 가능성이 제기돼 연구가 진행 중입니다.',
    aliases: ['CMC', '카복시메틸셀룰로오스']
  },
  {
    id: 'mcc',
    name: '미결정셀룰로스',
    hazard_level: 'low',
    description_short: '불용성 식이섬유 충전제',
    description_full:
      '미결정셀룰로스는 칼로리를 높이지 않고 부피를 증가시켜 저칼로리 식품·치즈 분말에 쓰입니다.',
    aliases: ['미결정셀룰로스']
  },
  {
    id: 'modified-starch',
    name: '변성전분',
    hazard_level: 'low',
    description_short: '스프·냉동식 맞춤 농후제',
    description_full:
      '변성전분은 천연 전분을 화학·물리적으로 가공해 냉동 안정성·점도 유지력을 높인 원료입니다.',
    aliases: ['변성전분', '개량전분']
  },
  {
    id: 'pectin',
    name: '펙틴',
    hazard_level: 'low',
    description_short: '과일 유래 젤화제',
    description_full:
      '펙틴은 사과·감귤 껍질에서 추출한 식이섬유로, 잼·젤리의 겔화와 요거트의 점도 개선에 쓰입니다.',
    aliases: ['펙틴']
  },

  /* --- 향미증진 --- */
  {
    id: 'disodium-inosinate',
    name: '디소듐이노신산',
    hazard_level: 'low',
    description_short: '핵산계 감칠맛 증진제',
    description_full:
      '디소듐이노신산(IMP)은 MSG와 함께 사용 시 감칠맛을 시너지 효과로 10배 이상 증폭시킵니다.',
    aliases: ['디소듐이노신산']
  },
  {
    id: 'disodium-guanylate',
    name: '디소듐구아닐산',
    hazard_level: 'low',
    description_short: '핵산계 감칠맛 증진제',
    description_full:
      '디소듐구아닐산(GMP)은 표고버섯·해조류의 구아닐산 성분을 모사해 육수 풍미를 강화합니다.',
    aliases: ['디소듐구아닐산']
  },
  {
    id: 'yeast-extract',
    name: '효모추출물',
    hazard_level: 'low',
    description_short: '천연 우마미 소재',
    description_full:
      '효모추출물은 사멸시킨 효모를 분해해 얻은 아미노산·핵산 혼합물로, “천연 MSG 대체” 조미 소재로 활용됩니다.',
    aliases: ['효모추출물']
  },

  /* --- 인공색소 --- */
  {
    id: 'yellow-5',
    name: '황색 5호',
    hazard_level: 'medium',
    description_short: '타르라진 식용색소',
    description_full:
      '황색 5호(타르라진)는 레몬색 음료·캔디에 쓰이며, 아스피린 민감성 체질에서 두드러기·천식이 보고된 바 있습니다.',
    aliases: ['황색5호', '타르라진']
  },
  {
    id: 'blue-1',
    name: '청색 1호',
    hazard_level: 'medium',
    description_short: '브릴리언트 블루 색소',
    description_full:
      '청색 1호는 스포츠음료·파란 아이스크림에 사용되며, 일반적으로 안전하나 일부 알레르기 보고가 있습니다.',
    aliases: ['청색1호', '브릴리언트블루']
  },
  {
    id: 'red-3',
    name: '적색 3호',
    hazard_level: 'high',
    description_short: '2025년 미국 사용금지 색소',
    description_full:
      '적색 3호(에리트로신)는 쥐 갑상선 종양 연구로 인해 2025년 1월 미국 FDA가 전면 금지했으며 EU도 제한적으로만 허용합니다.',
    aliases: ['적색3호', '에리트로신']
  },
  {
    id: 'yellow-6',
    name: '황색 6호',
    hazard_level: 'medium',
    description_short: '오렌지색 식용색소',
    description_full:
      '황색 6호(선셋옐로우)는 주황색 음료·과자에 쓰이며 EU에서는 어린이 과활동 주의 문구를 요구합니다.',
    aliases: ['황색6호', '선셋옐로우']
  },

  /* --- 감미료 --- */
  {
    id: 'sucralose',
    name: '수크랄로스',
    hazard_level: 'medium',
    description_short: '열안정 인공 감미료',
    description_full:
      '수크랄로스는 설탕 대비 600배 단맛을 내며, 제로칼로리 베이킹도 가능하지만 최근 장내 미생물·포도당 대사 영향 연구가 진행 중입니다.',
    aliases: ['수크랄로스']
  },
  {
    id: 'saccharin',
    name: '사카린',
    hazard_level: 'medium',
    description_short: '고전적 인공 감미료',
    description_full:
      '사카린은 설탕보다 300배 달지만 쓴맛 뒤끝이 있어 다른 감미료와 혼합 사용됩니다.',
    aliases: ['사카린']
  },
  {
    id: 'acesulfame-k',
    name: '아세설팜칼륨',
    hazard_level: 'medium',
    description_short: '제로음료 혼합 감미료',
    description_full:
      '아세설팜칼륨(Ace-K)은 열안정·칼로리 0 특성으로 구워 먹는 다이어트 간식에도 쓰입니다.',
    aliases: ['아세설팜칼륨']
  },
  {
    id: 'xylitol',
    name: '자일리톨',
    hazard_level: 'low',
    description_short: '충치 예방 당알코올',
    description_full:
      '자일리톨은 껌·치약에 쓰이며 인체에는 안전하지만 개에게는 치명적인 저혈당을 유발합니다.',
    aliases: ['자일리톨']
  },
  {
    id: 'erythritol',
    name: '에리트리톨',
    hazard_level: 'medium',
    description_short: '저칼로리 당알코올',
    description_full:
      '에리트리톨은 0.2 kcal/g으로 거의 칼로리가 없으나, 일부 연구에서 혈전 위험 가능성이 제기돼 추가 연구가 진행 중입니다.',
    aliases: ['에리트리톨']
  },
  {
    id: 'sorbitol',
    name: '소르비톨',
    hazard_level: 'medium',
    description_short: '습윤·감미 당알코올',
    description_full:
      '소르비톨은 습윤제 겸용으로 사탕·베이커리에 사용되며, 10% 이상 함유시 “과다 섭취 시 설사 유발” 경고가 의무입니다.',
    aliases: ['소르비톨']
  },
  {
    id: 'stevia',
    name: '스테비아',
    hazard_level: 'low',
    description_short: '천연 고감미 식물 추출',
    description_full:
      '스테비올배당체는 설탕 대비 300배 단맛, 혈당에 영향이 없어 다이어트·당뇨 식품에 널리 쓰입니다.',
    aliases: ['스테비아']
  },
  {
    id: 'monk-fruit',
    name: '몽크후르트',
    hazard_level: 'low',
    description_short: '루오한궈 유래 천연 감미료',
    description_full:
      '몽크후르트 감미료는 미국 GRAS, EU 미승인 상태이며 단맛은 설탕의 최대 250배입니다.',
    aliases: ['몽크후르트', '루오한궈']
  },

  /* --- 산화방지제 --- */
  {
    id: 'bht',
    name: 'BHT',
    hazard_level: 'high',
    description_short: '합성 산화방지제',
    description_full:
      'BHT(부틸화히드록시톨루엔)는 시리얼·스낵에 쓰이며 고용량에서 간독성 가능성이 보고되었습니다.',
    aliases: ['부틸화히드록시톨루엔']
  },
  {
    id: 'tbhq',
    name: 'TBHQ',
    hazard_level: 'high',
    description_short: '산화방지제·면역 억제 논란',
    description_full:
      'TBHQ는 튀김유·과자에 0.02% 이하로 쓰이며 일부 연구에서 면역세포 기능 억제가 보고되었습니다.',
    aliases: ['테르셔리부틸하이드로퀴논']
  },
  {
    id: 'tocopherol',
    name: '토코페롤',
    hazard_level: 'low',
    description_short: '비타민 E 천연 항산화제',
    description_full:
      '혼합 토코페롤은 식물성유에 자연 존재하며 산화를 늦추고, 동시에 비타민 E 영양을 제공합니다.',
    aliases: ['토코페롤', '비타민E']
  },

  /* --- 산미료 --- */
  {
    id: 'phosphoric-acid',
    name: '인산',
    hazard_level: 'medium',
    description_short: '콜라 산미료',
    description_full:
      '인산은 콜라 특유의 맛·pH를 조절하지만, 고인산 섭취는 칼슘 흡수를 방해해 골건강에 영향을 줄 수 있습니다.',
    aliases: ['인산']
  },
  {
    id: 'malic-acid',
    name: '말산',
    hazard_level: 'low',
    description_short: '사과산 산미료',
    description_full:
      '말산은 사과·포도 등 과일에 자연 존재하며 새콤한 맛이 오래 지속되는 특성이 있습니다.',
    aliases: ['말산']
  },

  /* --- 팽창제 --- */
  {
    id: 'sodium-bicarbonate',
    name: '탄산수소나트륨',
    hazard_level: 'low',
    description_short: '베이킹소다 팽창제',
    description_full:
      '탄산수소나트륨은 열·산에 의해 CO₂를 발생시켜 반죽을 부풀리는 데 사용됩니다.',
    aliases: ['베이킹소다', '중조']
  },
  {
    id: 'cream-of-tartar',
    name: '타르타르크림',
    hazard_level: 'low',
    description_short: '포도주 발효 부산물 팽창보조',
    description_full:
      '타르타르크림(주석산칼륨)은 머랭 거품 안정화와 베이킹파우더 산원으로 쓰입니다.',
    aliases: ['타르타르크림', '주석산칼륨']
  },
  {
    id: 'sodium-aluminum-phosphate',
    name: '산성 인산 알루미늄나트륨',
    hazard_level: 'medium',
    description_short: '베이킹파우더 산원',
    description_full:
      '산성 인산 알루미늄나트륨은 오븐에서 천천히 CO₂를 발생시켜 케이크를 고르게 부풀립니다.',
    aliases: ['산성인산알루미늄나트륨']
  },

  /* --- 항균제 --- */
  {
    id: 'nisin',
    name: '니신',
    hazard_level: 'low',
    description_short: '천연 유산균 항균제',
    description_full:
      '니신은 유산균이 만드는 펩타이드로, 치즈·통조림에서 식중독균을 억제합니다.',
    aliases: ['니신']
  },
  {
    id: 'natamycin',
    name: '나타마이신',
    hazard_level: 'low',
    description_short: '천연 항곰팡이제',
    description_full:
      '나타마이신은 치즈 껍질·건조소시지 표면 곰팡이 성장을 억제하는 항생물질로, 표면 처리에만 허용됩니다.',
    aliases: ['나타마이신']
  }
];

const recipeData = [
  {
    id: 'healthy-energy-bars',
    title: '집에서 만드는 건강한 에너지바',
    youtube_url: 'https://youtube.com/watch?v=example1'
  },
  {
    id: 'natural-smoothie',
    title: '천연 재료 스무디',
    youtube_url: 'https://youtube.com/watch?v=example2'
  },
  {
    id: 'homemade-bread',
    title: '첨가물 없는 수제 빵',
    youtube_url: 'https://youtube.com/watch?v=example3'
  },
  {
    id: 'organic-snacks',
    title: '유기농 간식 만들기',
    youtube_url: 'https://youtube.com/watch?v=example4'
  },
  {
    id: 'natural-preserves',
    title: '천연 보존 방법',
    youtube_url: 'https://youtube.com/watch?v=example5'
  }
];

export async function seedDatabase() {
  const db = admin.firestore();
  
  console.log('시드 데이터 추가 시작...');
  
  // 첨가물 데이터 추가
  const additiveBatch = db.batch();
  additiveData.forEach(additive => {
    const docRef = db.collection('additives').doc(additive.id);
    const { id, ...data } = additive;
    additiveBatch.set(docRef, data);
  });
  
  await additiveBatch.commit();
  console.log(`${additiveData.length}개의 첨가물 데이터가 추가되었습니다.`);
  
  // 레시피 데이터 추가
  const recipeBatch = db.batch();
  recipeData.forEach(recipe => {
    const docRef = db.collection('recipes').doc(recipe.id);
    const { id, ...data } = recipe;
    recipeBatch.set(docRef, data);
  });
  
  await recipeBatch.commit();
  console.log(`${recipeData.length}개의 레시피 데이터가 추가되었습니다.`);
  
  console.log('시드 데이터 추가 완료!');
}