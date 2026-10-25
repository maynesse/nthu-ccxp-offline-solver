# Privacy policy

**NTHU CCXP CAPTCHA — Offline Solver** does not collect or transmit personal
information, browsing history, credentials, CAPTCHA images, or answers to its
developer or third-party services.

## Local processing

The extension reads the CAPTCHA image already loaded on the matching NTHU
login page and fills its CAPTCHA field. It does not read password inputs,
submit forms, or access cookies.

Version 1.0.3 includes the recognition model in the extension package. A
background script reads that fixed internal file, verifies its integrity, and
provides it to the content script through Firefox extension messaging.
No model download, remote inference, telemetry, or storage permission is used.
Imported model data from older versions is unused by this version.

## External links

The status page contains optional links to NTHU and the original GitHub project.
Opening a link visits that website under its own privacy practices; these
links are not required to load the bundled model.

## Contact

Contact the maintainer through this repository's GitHub Issues.
This project is not affiliated with National Tsing Hua University.

Policy for release 1.0.3, October 2026.
