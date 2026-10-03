import type { Contact, Facility, FacilityType, Vulnerability } from '../types';

export const FACILITY_TYPES: FacilityType[] = ['護理之家', '長照機構', '養護中心', '日照中心', '身障機構', '醫院'];

// name | district | type | vulnerability | days since last roster update. All names are fictional.
const SEED_ROWS = `明德長照機構|三重區|長照機構|3|40
海雲養護中心|淡水區|養護中心|3|25
康禾護理之家|中和區|護理之家|3|60
晴光護理之家|新莊區|護理之家|3|210
安瀾身障機構|板橋區|身障機構|2|90
樂齡日照中心|永和區|日照中心|2|300
松柏養護中心|土城區|養護中心|2|15
仁愛護理之家|板橋區|護理之家|3|30
福田養護中心|板橋區|養護中心|2|45
恆安醫院|板橋區|醫院|3|20
慈暉長照機構|新店區|長照機構|3|120
青松日照中心|板橋區|日照中心|2|80
長青養護中心|三重區|養護中心|2|200
博愛身障機構|中和區|身障機構|3|35
德馨護理之家|新莊區|護理之家|2|50
春暉長照機構|蘆洲區|長照機構|2|10
惠康醫院|新店區|醫院|2|70
永順養護中心|汐止區|養護中心|3|190
啟明身障機構|樹林區|身障機構|3|55
和平護理之家|三重區|護理之家|2|65
同心日照中心|中和區|日照中心|2|28
懷恩長照機構|土城區|長照機構|3|100
安康養護中心|板橋區|養護中心|2|240
景福護理之家|永和區|護理之家|2|18
信望身障機構|新莊區|身障機構|2|75
頤和長照機構|林口區|長照機構|3|42
嘉禾養護中心|三峽區|養護中心|2|88
弘道醫院|淡水區|醫院|3|12
聖心護理之家|鶯歌區|護理之家|2|150
晨曦日照中心|汐止區|日照中心|2|33
綠蔭日照中心|板橋區|日照中心|1|60
陽光日照中心|三重區|日照中心|1|20
友善身障機構|中和區|身障機構|1|190
悠然日照中心|新店區|日照中心|1|44
晴空日照中心|新莊區|日照中心|1|95
樂活長照機構|蘆洲區|長照機構|1|30
光華日照中心|板橋區|日照中心|1|260
溫馨日照中心|永和區|日照中心|1|11
向日葵身障機構|五股區|身障機構|1|70
小草日照中心|泰山區|日照中心|1|130
敦和日照中心|瑞芳區|日照中心|1|85
安心醫院|板橋區|醫院|1|22`;

const PEOPLE = ['林美慧', '陳建宏', '王淑芬', '張志明', '李佩君', '黃俊傑', '吳雅婷', '劉家豪', '蔡宜蓁', '楊文雄', '許惠如', '鄭國華'];
const ROLES = ['護理長', '行政主任', '院長', '社工督導'];
const INACTIVE_SEED = '敦和日照中心';
export const DAY_MS = 86_400_000;

const pad2 = (n: number) => String(n).padStart(2, '0');

export const facilityId = (index: number) => `f-${String(index + 1).padStart(3, '0')}`;

export function createSeedFacilities(now: number): Facility[] {
  return SEED_ROWS.split('\n').map((line, i) => {
    const [name = '', district = '', type, vul, days] = line.split('|');
    const contact = (k: number): Contact => {
      const j = i * 2 + k;
      return {
        name: PEOPLE[j % PEOPLE.length]!,
        role: ROLES[j % ROLES.length]!,
        phone: `02-29${pad2(10 + (i % 90))}-${String(4000 + j * 13).slice(-4)}`,
        email: `contact${j + 1}@example.org`,
        isPrimary: k === 0,
      };
    };
    return {
      id: facilityId(i),
      name,
      district,
      type: type as FacilityType,
      vulnerability: Number(vul) as Vulnerability,
      residents: 30 + ((i * 37) % 90),
      contacts: [contact(0), contact(1)],
      active: name !== INACTIVE_SEED,
      updatedAt: now - Number(days) * DAY_MS,
    };
  });
}
