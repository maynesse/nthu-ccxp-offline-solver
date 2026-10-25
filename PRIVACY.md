# Privacy policy

**NTHU CCXP CAPTCHA — Offline Solver** does not collect or transmit personal
information, browsing history, login credentials, CAPTCHA images, or CAPTCHA
answers to its developer or to third-party services.

## Data used locally

- On the NTHU CCXP academic information login page, the extension reads the
  CAPTCHA image that the webpage already loaded. It calculates the six digits
  locally and fills the CAPTCHA input. It does not submit login forms.
- The extension uses Firefox's `storage` permission solely to save a local
  copy of a recognition-model file selected by the user (`tiny_net.pt`).
  The file is validated against the upstream project's Git blob SHA-1.
- The model can be deleted using the extension's setup page. Uninstalling the
  add-on also removes its local extension storage under normal Firefox behavior.
- The extension does not read cookies or password inputs and includes no
  analytics, advertisements, remote APIs, or remote code execution.

## External links

The setup page links to the upstream GitHub project so users can manually
retrieve the model, and to the NTHU site. Following these links opens external
websites, whose own privacy practices and network connections are separate
from this extension. The extension itself does not download the model.

## Contact

For questions, contact the maintainer through issues on this project's
GitHub repository once published. This is a community project and is
not affiliated with National Tsing Hua University.

Policy for release 1.0.2, October 2026.
