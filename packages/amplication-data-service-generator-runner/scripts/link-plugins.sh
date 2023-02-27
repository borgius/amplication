#!env bash
BASE=$(realpath "${BASH_SOURCE[0]:-${0}}/../..")
ROOT=$(realpath "$BASE/../..")
PLUGINS="$ROOT/libs/plugins/plugins"
DST="$BASE/amplication_modules/@amplication"
rm -rf $DST
mkdir -p $DST
for pkg in $PLUGINS/*; do
    plugin=$(basename $pkg)
    test -d $pkg/node_modules || {
        cd $pkg
        npm i
    }
    test -d $pkg/dist || {
        cd $pkg
        npm run build
    }

    ln -s "$pkg" "$DST/plugin-$plugin"
done
