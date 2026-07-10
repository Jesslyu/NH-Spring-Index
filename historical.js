// 1. 研究参数
var region = ee.Geometry.BBox(-180, 23.5, 180, 90); 
var startYear = 1961;
var endYear = 2025; 


var getPhenologyStrict = function(year) {
  var startDate = ee.Date.fromYMD(year, 1, 1);
  var endDate = ee.Date.fromYMD(year, 12, 31);
  
  // A. 获取并处理每日气温
  var dailyColl = ee.ImageCollection("ECMWF/ERA5_LAND/DAILY_AGGR")
    .filterDate(startDate, endDate)
    .select('temperature_2m')
    .map(function(img) {
      return img.subtract(273.15).set('system:time_start', img.get('system:time_start'));
    });

  // B. 计算候温 (5天滑动平均序列)
  var dailyBands = dailyColl.toBands();
  var houTempList = ee.List.sequence(0, dailyColl.size().subtract(5)).map(function(i) {
    i = ee.Number(i);
    // 这里的 meanImg 是 5天滑动平均气温
    var meanImg = dailyBands.select(ee.List.sequence(i, i.add(4))).reduce(ee.Reducer.mean());
    return meanImg.set('idx', i);
  });
  var houTempColl = ee.ImageCollection.fromImages(houTempList);

  // --- 修改重点：执行“连续5天达标”判断 ---
  
  // 1. 定义识别函数
  var findSeasonOnset = function(tempColl, threshold) {
    // 将满足阈值的像元设为1，不满足设为0
    var binary = tempColl.map(function(img) {
      return img.gte(threshold).int().set('idx', img.get('idx'));
    });
    
    var binaryBands = binary.toBands();
    var size = binary.size();
    
    // 检查连续5个滑动平均值是否均 >= threshold
    var verified = ee.List.sequence(0, size.subtract(5)).map(function(i) {
      i = ee.Number(i);
      // 选取从第i天开始的5个滑动平均值，取最小值。如果最小值为1，说明连续5天达标
      var isStable = binaryBands.select(ee.List.sequence(i, i.add(4))).reduce(ee.Reducer.min());
      var doy = i.add(1); // 对应气温序列中的起始日期
      return ee.Image(doy).updateMask(isStable).float();
    });
    
    // 返回满足条件的第一个DOY
    return ee.ImageCollection.fromImages(verified).reduce(ee.Reducer.min());
  };

  // C. 提取春季开始时间 (SOS)：连续5个候温 >= 10°C
  var springOnset = findSeasonOnset(houTempColl, 10).rename('onset');
  
  // D. 提取夏季开始时间 (EOS)：连续5个候温 >= 22°C
  var springWithdrawal = findSeasonOnset(houTempColl, 22).rename('withdrawal');
  
  // E. 计算长度
  var springLength = springWithdrawal.subtract(springOnset).rename('length');

  return ee.Image([springOnset, springWithdrawal, springLength])
    .clip(region)
    .set('year', year);
};

// 2. 导出
for (var y = startYear; y <= endYear; y++) {
  Export.image.toDrive({
    image: getPhenologyStrict(y),
    description: 'Strict_Spring3_' + y,
    folder: 'ERA5_Phenology_Strict',
    region: region,
    scale: 11132,
    crs: 'EPSG:4326',
    maxPixels: 1e13
  });
}