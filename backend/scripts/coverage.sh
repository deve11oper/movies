#!/usr/bin/env bash
# Run the PHPUnit suite and fail unless app/ line coverage is 100%.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
pcov_so="${PCOV_SO:-/tmp/pcov-deb/usr/lib/php/20230831/pcov.so}"

if [[ ! -f "$pcov_so" ]]; then
  mkdir -p /tmp/pcov-deb
  (
    cd /tmp/pcov-deb
    apt-get download php8.3-pcov
    dpkg -x php8.3-pcov_*.deb .
  )
  pcov_so="$(find /tmp/pcov-deb -name pcov.so | head -1)"
fi

cd "$root"
php artisan config:clear --ansi
report="${TMPDIR:-/tmp}/movies-coverage.txt"
php -d "extension=${pcov_so}" -d pcov.enabled=1 vendor/bin/phpunit --coverage-text="$report"
sed 's/\x1b\[[0-9;]*m//g' "$report"

php -r '
$report = preg_replace("/\x1b\[[0-9;]*m/", "", file_get_contents($argv[1]));
if (!preg_match("/Lines:\\s+([0-9.]+)%/", $report, $match)) {
    fwrite(STDERR, "Coverage report has no line summary.\n");
    exit(1);
}
if ((float) $match[1] < 100) {
    fwrite(STDERR, "Line coverage is {$match[1]}%, expected 100%.\n");
    exit(1);
}
' "$report"
