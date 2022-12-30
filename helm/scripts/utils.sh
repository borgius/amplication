#!env bash

has() { type "$1" &> /dev/null; }

parseArgsBase() {
  local args="$@"
  ARGS=" $ARGS "
  for i in $args;  do
    case $i in
      --*=*)
        local name=${i#--}
        name=$(echo ${name%%=*} | tr '[:lower:]' '[:upper:]')
        name=${name//-/_}
        export $name=${i#*=}
        ARGS=${ARGS/ $i / }
        ;;
      --no-*)
        local name=${i#--no-}
        name=$(echo ${name} | tr '[:lower:]' '[:upper:]')
        name=${name//-/_}
        export $name=
        ARGS=${ARGS/ $i / }
        ;;
      --*)
        local name=${i#--}
        name=$(echo ${name} | tr '[:lower:]' '[:upper:]')
        name=${name//-/_}
        export $name=1
        ARGS=${ARGS/ $i /}
        ;;
      *) 
        [[ $ARGS == *$i* ]] || ARGS="$ARGS $i";
        ;;
    esac    
  done
}   

isSourced() {
  test ${BASH_SOURCE[0]} || return 0
	# https://unix.stackexchange.com/a/215279
	[ "${#FUNCNAME[@]}" -ge 2 ] \
		&& [ "${FUNCNAME[0]}" = 'isSourced' ] \
		&& [ "${FUNCNAME[1]}" = 'source' ]
}

runIfNotSourced() {
  isSourced || {
    ARGS=
    parseArgsBase "$@"
    set -- $ARGS
    local cmd=$1
    has $cmd && {
      shift
      $cmd "$@"
    } 
  }
}
