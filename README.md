# NH-Spring-Index

Google Earth Engine (GEE) scripts for extracting historical and future spring indices across the Northern Hemisphere using ERA5-Land reanalysis and NASA NEX-GDDP-CMIP6 climate projection datasets.

## Overview

This repository contains the Google Earth Engine scripts developed for the study:

**Changes in spring length across the Northern Hemisphere under historical climate change and future warming scenarios.**

The scripts identify three meteorological spring indices based on daily near-surface air temperature:

- **Spring onset (SOS)** – the first day when the 5-day moving average temperature remains ≥ 10°C for five consecutive periods.
- **Spring ending (EOS)** – the first day when the 5-day moving average temperature remains ≥ 22°C for five consecutive periods.
- **Spring length (SL)** – calculated as:

\[
SL = EOS - SOS
\]

The same algorithm is applied to both historical reanalysis data and future climate projections to ensure methodological consistency.

---

## Repository Structure

```
NH-Spring-Index/

│── historical.js
│      GEE script for extracting historical spring indices
│      using ERA5-Land daily temperature.

│── future.js
│      GEE script for extracting future spring indices
│      using NASA NEX-GDDP-CMIP6 daily temperature.

└── README.md
```

---

## Datasets

### Historical

- ERA5-Land Daily Aggregated
- European Centre for Medium-Range Weather Forecasts (ECMWF)
- Copernicus Climate Change Service (C3S)

### Future

- NASA NEX-GDDP-CMIP6
- Daily near-surface air temperature (tas)
- Historical and SSP scenarios

---

## Method

For each grid cell:

1. Calculate the 5-day moving average of daily mean temperature.
2. Identify spring onset (SOS) as the first day satisfying:

   - 5-day moving average ≥ 10°C
   - Stable for five consecutive moving windows.

3. Identify spring ending (EOS) as the first day satisfying:

   - 5-day moving average ≥ 22°C
   - Stable for five consecutive moving windows.

4. Compute spring length:

```
SL = EOS − SOS
```

The algorithm is applied consistently to both historical and future datasets.

---

## Platform

All scripts were developed using the Google Earth Engine JavaScript API.

https://earthengine.google.com/

---

## Citation

If you use this repository, please cite the associated publication (to be added after publication).

Lyu, J., et al. (2026). *The Spatial Reshaping of Northern Hemisphere Spring Under Global Warming*. Earth's Future.

---

## License

This repository is released for academic and research purposes.
