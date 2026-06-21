import provincesData from './iranCities.json';

export interface IranCity {
  name: string;
  province: string;
  lat: number;
  lng: number;
}

// ÊÈÏíá ÓÇÎÊÇÑ ÊæÏÑÊæí ÇÓÊÇäåÇ Èå ÂÑÇíå? ÊÎÊ ÔåÑåÇ
export const iranCities: IranCity[] = provincesData.flatMap((province: any) =>
  province.cities.map((city: any) => ({
    name: city['city-fa'],
    province: province['province-fa'],
    lat: 0,   // ãÞÏÇÑ æÇÞÚí ÏÑ JSON äíÓÊ¡ ãíÊæÇä ÈÚÏÇð ãÎÊÕÇÊ ÑÇ ÇÖÇÝå ˜ÑÏ
    lng: 0,
  }))
);

export const provinces = [...new Set(iranCities.map(c => c.province))];