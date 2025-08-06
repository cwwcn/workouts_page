interface ISiteMetadataResult {
  siteTitle: string;
  siteUrl: string;
  description: string;
  keywords: string;
  logo: string;
  navLinks: {
    name: string;
    url: string;
  }[];
}

const getBasePath = () => {
  const baseUrl = import.meta.env.BASE_URL;
  return baseUrl === '/' ? '' : baseUrl;
};

const data: ISiteMetadataResult = {
  siteTitle: '我的跑步日记',
  siteUrl: 'https://run.chenzhuo.space',
  logo: '/images/touxiang.png',
  description: '我的跑步日记',
  keywords: 'workouts, running, cycling, riding, roadtrip, hiking, swimming',
  navLinks: [
    {
      name: 'Summary',
      url: `${getBasePath()}/summary`,
    },
    {
      name: '我的Strava',
      url: 'https://www.strava.com/athletes/96343722',
    },
    {
      name: '运动数据同步工具',
      url: 'https://github.com/cwwcn/GearSync',
    },
  ],
};

export default data;
