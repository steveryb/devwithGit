import os
import shutil
from functools import reduce

def is_init(backup_path, directories, index_path, identity_string):
    """
    Check if a given folder is initialised for a pgit like SCM system with the
    given identity or not.
    """
    try:
        fail_exist_dir = not reduce(lambda a,b: a and b, [os.path.exists(d) for d in directories], True)
        with open(index_path) as f: 
            if (f.readline().strip() != identity_string) or fail_exist_dir: 
                return False
    except IOError as e:
        return False
    return True

def init(backup_path, directories, index_path, identity_string):
    """
    Create a pgit repo in the given folder with the given backup_path,
    contents_path, putting the index file with the given identity in the given
    path.

    Returns whether the initialisation was successful or not.
    """
    try:
        if(os.path.exists(backup_path)):
            shutil.rmtree(backup_path)
        os.mkdir(backup_path)
        for d in directories:
            os.mkdir(d)
        with open(index_path,"w") as f:
            f.write(identity_string)
        return True
    except IOError as e:
        return False

def remove_repository(backup_path):
    """
    Remove the given path if it exists. Returns if operation succeeded or not.
    """
    if os.path.exists(backup_path): 
            shutil.rmtree(backup_path)
            return True
    else: 
            return False


def rm(files,path):
    """
    Given a list of paths, delete them. This will try remove directories listed and
    their contents.
    """
    for f in files:
       dels = os.path.join(path,f) 
       if os.path.isdir(dels):
           shutil.rmtree(dels)
       else:
           os.remove(dels)

def cp(filenames,src_path,dest_path):
    """
    Given a list of filenames in a source directory, copy them to the destination. 
    This will try copy directories and their contents to the destination.
    """
    for f,n in filenames:
        src = os.path.join(src_path,f) 
        dst = os.path.join(dest_path,n)
        if os.path.isdir(src):
           shutil.copytree(src,dst)
        else:
           shutil.copyfile(src,dst)
